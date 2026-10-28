import neo4j from 'neo4j-driver'
import { prisma } from '../../utils/prisma'
import { withSession } from '../../utils/neo4j'
import { getGithubIdForUser } from '../../lib/github'

const toNum = (value: unknown): number => {
  if (value == null) return 0
  const boxed = value as { toNumber?: () => number }
  return typeof boxed.toNumber === 'function' ? boxed.toNumber() : Number(value)
}

// Positive engagement only: NOT_INTERESTED is deliberately left out.
const ENGAGED = 'STARRED|CONTRIBUTED_TO|OWNS|INTERACTED_WITH'

// Other users who share skills or repositories with this user. Match blends the
// share of the user's skills the other person also has (70%) with overlapping
// repositories (30%, saturating).
const SIMILAR_USERS_CYPHER = `
  MATCH (me:User {githubId: $githubId})
  CALL {
    WITH me
    MATCH (me)-[:HAS_SKILL]->(:Skill)<-[:HAS_SKILL]-(other:User)
    WHERE other <> me
    RETURN other
    UNION
    WITH me
    MATCH (me)-[:${ENGAGED}]->(:Repository)<-[:${ENGAGED}]-(other:User)
    WHERE other <> me
    RETURN other
  }
  WITH DISTINCT me, other
  CALL {
    WITH me, other
    OPTIONAL MATCH (me)-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(other)
    RETURN collect(DISTINCT s.name) AS sharedSkills
  }
  CALL {
    WITH me, other
    OPTIONAL MATCH (me)-[:${ENGAGED}]->(r:Repository)<-[:${ENGAGED}]-(other)
    RETURN count(DISTINCT r) AS sharedRepos
  }
  CALL {
    WITH me
    OPTIONAL MATCH (me)-[:HAS_SKILL]->(s:Skill)
    RETURN count(s) AS mySkillCount
  }
  CALL {
    WITH other
    OPTIONAL MATCH (other)-[hs:HAS_SKILL]->(s:Skill)
    WITH s, hs ORDER BY hs.score DESC
    RETURN collect(s.name)[0..6] AS topSkills
  }
  WITH other, sharedSkills, sharedRepos, topSkills,
       0.7 * CASE WHEN mySkillCount > 0 THEN toFloat(size(sharedSkills)) / mySkillCount ELSE 0.0 END
       + 0.3 * toFloat(sharedRepos) / (sharedRepos + 3) AS match
  RETURN other.githubId AS githubId, sharedSkills, sharedRepos, topSkills, match
  ORDER BY match DESC, githubId ASC
  LIMIT $limit
`

// Repositories where people similar to this user are active but the user isn't
// yet, ranked by how many of those people are involved.
const COLLABORATIONS_CYPHER = `
  MATCH (me:User {githubId: $githubId})
  MATCH (me)-[:HAS_SKILL|${ENGAGED}]->()<-[:HAS_SKILL|${ENGAGED}]-(peer:User)
  WHERE peer <> me
  WITH DISTINCT me, peer
  MATCH (peer)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r:Repository)
  WHERE NOT (me)-[:${ENGAGED}|NOT_INTERESTED]->(r)
    AND coalesce(r.archived, false) = false
  WITH r, count(DISTINCT peer) AS peers
  RETURN r.id AS repositoryId, peers
  ORDER BY peers DESC, coalesce(r.goodFirstIssues, 0) DESC, r.id ASC
  LIMIT $limit
`

export type CommunityContributor = {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  topSkills: string[]
  sharedSkills: string[]
  sharedRepos: number
  matchScore: number
}

export type CollaborationOpportunity = {
  repositoryId: string
  fullName: string
  owner: string
  name: string
  description: string | null
  stack: string[]
  peers: number
  goodFirstIssueCount: number
  pushedAt: Date | null
}

const listContributors = async (userId: string, limit: number): Promise<CommunityContributor[]> => {
  const githubId = await getGithubIdForUser(userId)
  if (githubId === null) return []

  const result = await withSession(session =>
    session.run(SIMILAR_USERS_CYPHER, { githubId, limit: neo4j.int(limit) })
  )
  const rows = result.records.map(record => ({
    githubId: String(toNum(record.get('githubId'))),
    sharedSkills: record.get('sharedSkills') as string[],
    sharedRepos: toNum(record.get('sharedRepos')),
    topSkills: record.get('topSkills') as string[],
    match: toNum(record.get('match'))
  }))
  if (rows.length === 0) return []

  // Graph nodes only carry the GitHub id; profile details live in Postgres.
  const accounts = await prisma.oAuthAccount.findMany({
    where: { provider: 'github', providerId: { in: rows.map(r => r.githubId) } },
    select: { providerId: true, username: true, user: { select: { id: true, name: true, avatarUrl: true } } }
  })
  const byGithubId = new Map(accounts.map(a => [a.providerId, a]))

  return rows.flatMap(row => {
    const account = byGithubId.get(row.githubId)
    if (!account || account.user.id === userId) return []
    return [{
      id: account.user.id,
      name: account.user.name,
      username: account.username,
      avatarUrl: account.user.avatarUrl,
      topSkills: row.topSkills,
      sharedSkills: row.sharedSkills,
      sharedRepos: row.sharedRepos,
      matchScore: Math.round(row.match * 100)
    }]
  })
}

const listCollaborations = async (userId: string, limit: number): Promise<CollaborationOpportunity[]> => {
  const githubId = await getGithubIdForUser(userId)
  if (githubId === null) return []

  const result = await withSession(session =>
    session.run(COLLABORATIONS_CYPHER, { githubId, limit: neo4j.int(limit) })
  )
  const peersByRepo = new Map(result.records.map(record => [record.get('repositoryId') as string, toNum(record.get('peers'))]))
  if (peersByRepo.size === 0) return []

  const repositories = await prisma.repository.findMany({
    where: { id: { in: [...peersByRepo.keys()] }, hidden: false, archived: false },
    select: {
      id: true, fullName: true, owner: true, name: true, description: true,
      languages: true, frameworks: true, goodFirstIssueCount: true, pushedAt: true
    }
  })

  return repositories
    .map(repo => {
      const languages = repo.languages && typeof repo.languages === 'object'
        ? Object.entries(repo.languages as Record<string, number>).sort(([, a], [, b]) => b - a).slice(0, 3).map(([lang]) => lang)
        : []
      return {
        repositoryId: repo.id,
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
        description: repo.description,
        stack: [...languages, ...repo.frameworks.slice(0, 2)],
        peers: peersByRepo.get(repo.id) ?? 0,
        goodFirstIssueCount: repo.goodFirstIssueCount,
        pushedAt: repo.pushedAt
      }
    })
    .sort((a, b) => b.peers - a.peers || b.goodFirstIssueCount - a.goodFirstIssueCount)
}

export const CommunityService = {
  listContributors,
  listCollaborations
}
