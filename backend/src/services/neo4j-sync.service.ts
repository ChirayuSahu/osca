import { withSession } from '../utils/neo4j'

export interface ContributorGraphStats {
  repoCount: number
  languageCount: number
  frameworkCount: number
  topicCount: number
  avgStars: number
  maxStars: number
  collaboratorCount: number
}

// neo4j-driver returns Integer objects (not plain numbers) for count()/size(),
// but plain floats for avg() — normalise both to JS numbers.
const toNum = (value: unknown): number => {
  if (value == null) return 0
  const boxed = value as { toNumber?: () => number }
  return typeof boxed.toNumber === 'function' ? boxed.toNumber() : Number(value)
}

export const Neo4jSyncService = {
  async syncUser(user: { githubId?: number; username: string }) {
    if (!user.githubId) return

    await withSession(session =>
      session.run(
        `
        MERGE (u:User {githubId: $githubId})
        SET u.username = $username
        `,
        { githubId: user.githubId, username: user.username }
      )
    )
  },

  async syncRepository(repo: {
    id: string;
    name: string;
    owner: string;
    description?: string | null;
    stars?: number;
  }) {
    await withSession(session =>
      session.run(
        `
        MERGE (r:Repository {id: $id})
        SET r.name = $name,
            r.owner = $owner,
            r.description = $description,
            r.stars = $stars
        `,
        {
          id: repo.id,
          name: repo.name,
          owner: repo.owner,
          description: repo.description ?? '',
          stars: repo.stars ?? 0
        }
      )
    )
  },

  async syncInteraction(userGithubId: number, repoId: string, action: string) {
    // Basic interaction mapping (example)
    let relType = 'INTERACTED_WITH'
    if (action === 'STARRED') relType = 'STARRED'
    else if (action === 'CONTRIBUTED_TO' || action === 'CONTRIBUTION') relType = 'CONTRIBUTED_TO'
    else if (action === 'OWNS') relType = 'OWNS'

    await withSession(session =>
      session.run(
        `
        MATCH (u:User {githubId: $userGithubId})
        MATCH (r:Repository {id: $repoId})
        MERGE (u)-[rel:${relType}]->(r)
        SET rel.updatedAt = datetime()
        `,
        { userGithubId, repoId }
      )
    )
  },

  // Mirrors syncInteraction's action->relType mapping so callers can undo a
  // toggle (e.g. unliking a repo) without needing to know the Cypher rel type.
  async removeInteraction(userGithubId: number, repoId: string, action: string) {
    let relType = 'INTERACTED_WITH'
    if (action === 'STARRED') relType = 'STARRED'
    else if (action === 'CONTRIBUTED_TO' || action === 'CONTRIBUTION') relType = 'CONTRIBUTED_TO'
    else if (action === 'OWNS') relType = 'OWNS'

    await withSession(session =>
      session.run(
        `
        MATCH (u:User {githubId: $userGithubId})-[rel:${relType}]->(r:Repository {id: $repoId})
        DELETE rel
        `,
        { userGithubId, repoId }
      )
    )
  },

  async syncUserSkills(userGithubId: number, skills: { name: string; proficiencyScore: number }[]) {
    await withSession(async session => {
      for (const skill of skills) {
        await session.run(
          `
          MATCH (u:User {githubId: $userGithubId})
          MERGE (s:Skill {name: $skillName})
          MERGE (u)-[rel:HAS_SKILL]->(s)
          SET rel.score = $score
          `,
          { userGithubId, skillName: skill.name, score: skill.proficiencyScore }
        )
      }
    })
  },

  async syncRepositoryTechStack(repoId: string, data: { languages: Record<string, number>, frameworks: string[], techStack: string[], ciCd: string[] }) {
    await withSession(async session => {
      // 1. Sync Languages
      for (const [lang, bytes] of Object.entries(data.languages)) {
        await session.run(
          `
          MATCH (r:Repository {id: $repoId})
          MERGE (l:Language {name: $lang})
          MERGE (r)-[rel:USES_LANGUAGE]->(l)
          SET rel.bytes = $bytes
          `,
          { repoId, lang, bytes }
        )
      }

      // 2. Sync Frameworks
      for (const framework of data.frameworks) {
        await session.run(
          `
          MATCH (r:Repository {id: $repoId})
          MERGE (f:Framework {name: $framework})
          MERGE (r)-[:USES_FRAMEWORK]->(f)
          `,
          { repoId, framework }
        )
      }

      // 3. Sync Tools/Databases/CI_CD
      for (const tech of data.techStack) {
        if (!data.frameworks.includes(tech)) {
          await session.run(
            `
            MATCH (r:Repository {id: $repoId})
            MERGE (t:Tool {name: $tech})
            MERGE (r)-[:USES_TOOL]->(t)
            `,
            { repoId, tech }
          )
        }
      }

      for (const ci of data.ciCd) {
        await session.run(
          `
          MATCH (r:Repository {id: $repoId})
          MERGE (c:CI_CD {name: $ci})
          MERGE (r)-[:USES_CI]->(c)
          `,
          { repoId, ci }
        )
      }
    })
  },

  async syncRepositoryTopics(repoId: string, topics: string[]) {
    if (!topics.length) return

    await withSession(async session => {
      for (const topic of topics) {
        await session.run(
          `
          MATCH (r:Repository {id: $repoId})
          MERGE (t:Topic {name: $topic})
          MERGE (r)-[:HAS_TOPIC]->(t)
          `,
          { repoId, topic }
        )
      }
    })
  },

  // Aggregates everything the contributor-analysis scoring needs from the graph:
  // the distinct Language/Framework/Topic spread and collaborator reach across
  // every repo the user owns, starred, or contributed to.
  async getContributorGraphStats(githubId: number): Promise<ContributorGraphStats> {
    return withSession(async session => {
      const result = await session.run(
        `
        MATCH (u:User {githubId: $githubId})
        CALL {
          WITH u
          MATCH (u)-[:OWNS|STARRED|CONTRIBUTED_TO]->(r:Repository)
          RETURN collect(DISTINCT r) AS repos
        }
        CALL {
          WITH repos
          UNWIND repos AS r
          OPTIONAL MATCH (r)-[:USES_LANGUAGE]->(l:Language)
          RETURN count(DISTINCT l) AS languageCount
        }
        CALL {
          WITH repos
          UNWIND repos AS r
          OPTIONAL MATCH (r)-[:USES_FRAMEWORK]->(f:Framework)
          RETURN count(DISTINCT f) AS frameworkCount
        }
        CALL {
          WITH repos
          UNWIND repos AS r
          OPTIONAL MATCH (r)-[:HAS_TOPIC]->(t:Topic)
          RETURN count(DISTINCT t) AS topicCount
        }
        CALL {
          WITH repos
          UNWIND repos AS r
          RETURN avg(r.stars) AS avgStars, max(r.stars) AS maxStars
        }
        CALL {
          WITH u, repos
          UNWIND repos AS r
          MATCH (other:User)-[:OWNS|STARRED|CONTRIBUTED_TO]->(r)
          WHERE other <> u
          RETURN count(DISTINCT other) AS collaboratorCount
        }
        RETURN size(repos) AS repoCount, languageCount, frameworkCount, topicCount, avgStars, maxStars, collaboratorCount
        `,
        { githubId }
      )

      const record = result.records[0]
      if (!record) {
        return { repoCount: 0, languageCount: 0, frameworkCount: 0, topicCount: 0, avgStars: 0, maxStars: 0, collaboratorCount: 0 }
      }

      return {
        repoCount: toNum(record.get('repoCount')),
        languageCount: toNum(record.get('languageCount')),
        frameworkCount: toNum(record.get('frameworkCount')),
        topicCount: toNum(record.get('topicCount')),
        avgStars: toNum(record.get('avgStars')),
        maxStars: toNum(record.get('maxStars')),
        collaboratorCount: toNum(record.get('collaboratorCount'))
      }
    })
  }
}
