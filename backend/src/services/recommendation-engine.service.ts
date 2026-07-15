import neo4j, { Session } from 'neo4j-driver'
import { prisma } from '../utils/prisma'
import { withSession } from '../utils/neo4j'
import { config } from '../config'

const REPO_SELECT = {
  id: true,
  name: true,
  owner: true,
  fullName: true,
  provider: true,
  githubId: true,
  description: true,
  url: true,
  languages: true,
  frameworks: true,
  techStack: true,
  topics: true,
  ciCd: true,
  stars: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { likes: true, interactions: true }
  }
} as const

// Fallback feed used when Neo4j is unavailable or has no graph edges yet for
// this user (e.g. contributor/repository analysis hasn't run). Not personalized,
// but ensures the user sees something instead of a blank page.
const fallbackFeed = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit

  // Repository.owner stores the GitHub login, not our internal user id, so
  // resolve the user's GitHub username to exclude their own repos.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { oauthAccounts: { where: { provider: 'github' }, select: { username: true } } }
  })
  const githubUsername = user?.oauthAccounts[0]?.username

  const where = {
    hidden: false,
    ...(githubUsername ? { NOT: { owner: githubUsername } } : {})
  }

  const [repositories, total] = await Promise.all([
    prisma.repository.findMany({
      where,
      select: REPO_SELECT,
      orderBy: [{ stars: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take: limit
    }),
    prisma.repository.count({ where })
  ])

  return {
    feed: repositories.map((repository) => ({
      repository,
      scoreInfo: {
        repositoryId: repository.id,
        totalScore: repository.stars,
        breakdown: { contentScore: 0, collabScore: 0, topicScore: 0, fallback: true }
      }
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

type GraphFeedParams = {
  userId: string
  githubId: number
  page: number
  limit: number
  skip: number
  weights: typeof config.recommendation
}

// Candidate repos are the UNION of three independent sources (skill match,
// topic similarity, collaborative filtering) so a user with no HAS_SKILL
// edges yet can still surface candidates via topic/collaborative signals —
// each candidate is then scored on all three dimensions together.
const runGraphFeed = async (session: Session, { userId, githubId, page, limit, skip, weights }: GraphFeedParams) => {
  const cypher = `
    MATCH (u:User {githubId: $githubId})
    CALL {
      WITH u
      MATCH (u)-[:HAS_SKILL]->(:Skill)<-[:USES_LANGUAGE|USES_FRAMEWORK]-(r:Repository)
      RETURN r
      UNION
      WITH u
      MATCH (u)-[:STARRED|CONTRIBUTED_TO|OWNS]->(:Repository)-[:HAS_TOPIC]->(:Topic)<-[:HAS_TOPIC]-(r:Repository)
      RETURN r
      UNION
      WITH u
      MATCH (u)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(:Repository)<-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]-(:User)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r:Repository)
      RETURN r
    }
    WITH DISTINCT u, r
    WHERE NOT (u)-[:STARRED|CONTRIBUTED_TO|OWNS]->(r)

    OPTIONAL MATCH (u)-[hs:HAS_SKILL]->(s:Skill)<-[:USES_LANGUAGE|USES_FRAMEWORK]-(r)
    WITH u, r, sum(hs.score) AS contentScore

    OPTIONAL MATCH (u)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r2:Repository)<-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]-(other:User)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r)
    WHERE r <> r2
    WITH u, r, contentScore, count(DISTINCT other) AS collabScore

    OPTIONAL MATCH (u)-[:STARRED|CONTRIBUTED_TO|OWNS]->(r3:Repository)-[:HAS_TOPIC]->(t:Topic)<-[:HAS_TOPIC]-(r)
    WHERE r <> r3
    WITH r, contentScore, collabScore, count(DISTINCT t) AS topicScore

    WITH r, contentScore, collabScore, topicScore,
      (coalesce(contentScore, 0) * $contentWeight
        + coalesce(collabScore, 0) * $collabWeight
        + coalesce(topicScore, 0) * $topicWeight
        + log(coalesce(r.stars, 0) + 1) * $starsWeight) AS totalScore
    ORDER BY totalScore DESC

    SKIP $skip
    LIMIT $limit

    RETURN r.id AS repositoryId, totalScore, contentScore, collabScore, topicScore
  `

  const result = await session.run(cypher, {
    githubId,
    skip: neo4j.int(skip),
    limit: neo4j.int(limit),
    contentWeight: weights.contentWeight,
    collabWeight: weights.collabWeight,
    topicWeight: weights.topicWeight,
    starsWeight: weights.starsWeight
  })

  const recommendations = result.records.map(record => ({
    repositoryId: record.get('repositoryId'),
    totalScore: record.get('totalScore'),
    contentScore: record.get('contentScore'),
    collabScore: record.get('collabScore'),
    topicScore: record.get('topicScore')
  }))

  const repoIds = recommendations.map(r => r.repositoryId)

  if (repoIds.length === 0) {
    return fallbackFeed(userId, page, limit)
  }

  // Fetch full repository data from Prisma based on the IDs returned by Neo4j
  const repositories = await prisma.repository.findMany({
    where: { id: { in: repoIds } },
    select: REPO_SELECT
  })

  // Map the Prisma repositories back to the scored recommendations
  const feed = recommendations.map(rec => {
    const repo = repositories.find(r => r.id === rec.repositoryId)
    return {
      repository: repo,
      scoreInfo: {
        repositoryId: rec.repositoryId,
        totalScore: rec.totalScore,
        breakdown: {
          contentScore: rec.contentScore,
          collabScore: rec.collabScore,
          topicScore: rec.topicScore
        }
      }
    }
  }).filter(f => f.repository != null)

  // For total count, reuse the same candidate-union but skip scoring
  const countCypher = `
    MATCH (u:User {githubId: $githubId})
    CALL {
      WITH u
      MATCH (u)-[:HAS_SKILL]->(:Skill)<-[:USES_LANGUAGE|USES_FRAMEWORK]-(r:Repository)
      RETURN r
      UNION
      WITH u
      MATCH (u)-[:STARRED|CONTRIBUTED_TO|OWNS]->(:Repository)-[:HAS_TOPIC]->(:Topic)<-[:HAS_TOPIC]-(r:Repository)
      RETURN r
      UNION
      WITH u
      MATCH (u)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(:Repository)<-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]-(:User)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r:Repository)
      RETURN r
    }
    WITH DISTINCT u, r
    WHERE NOT (u)-[:STARRED|CONTRIBUTED_TO|OWNS]->(r)
    RETURN count(r) AS total
  `
  const countResult = await session.run(countCypher, { githubId })
  const total = countResult.records[0]?.get('total')?.toNumber() || 0
  const totalPages = Math.ceil(total / limit)

  return {
    feed,
    total,
    page,
    limit,
    totalPages
  }
}

export const generateFeed = async (userId: string, page: number = 1, limit: number = 20) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, oauthAccounts: { where: { provider: 'github' } } }
  })

  if (!user || !user.oauthAccounts[0]?.providerId) {
    return fallbackFeed(userId, page, limit)
  }

  const githubId = parseInt(user.oauthAccounts[0].providerId, 10)
  const skip = (page - 1) * limit
  const weights = config.recommendation

  try {
    return await withSession(session => runGraphFeed(session, { userId, githubId, page, limit, skip, weights }))
  } catch (error) {
    console.error(`[RecommendationEngine] Failed to generate feed from Neo4j for user ${userId}:`, error)
    return fallbackFeed(userId, page, limit)
  }
}

export const RecommendationEngineService = {
  generateFeed
}
