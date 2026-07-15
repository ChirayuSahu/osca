import { neo4jDriver } from '../utils/neo4j'
import { config } from '../config'

export const Neo4jSyncService = {
  async syncUser(user: { githubId?: number; username: string }) {
    if (!user.githubId) return

    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
      await session.run(
        `
        MERGE (u:User {githubId: $githubId})
        SET u.username = $username
        `,
        { githubId: user.githubId, username: user.username }
      )
    } finally {
      await session.close()
    }
  },

  async syncRepository(repo: { 
    id: string; 
    name: string; 
    owner: string;
    description?: string | null;
    stars?: number;
  }) {
    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
      await session.run(
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
    } finally {
      await session.close()
    }
  },

  async syncInteraction(userGithubId: number, repoId: string, action: string) {
    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
      // Basic interaction mapping (example)
      let relType = 'INTERACTED_WITH'
      if (action === 'STARRED') relType = 'STARRED'
      else if (action === 'CONTRIBUTED_TO' || action === 'CONTRIBUTION') relType = 'CONTRIBUTED_TO'
      else if (action === 'OWNS') relType = 'OWNS'

      await session.run(
        `
        MATCH (u:User {githubId: $userGithubId})
        MATCH (r:Repository {id: $repoId})
        MERGE (u)-[rel:${relType}]->(r)
        SET rel.updatedAt = datetime()
        `,
        { userGithubId, repoId }
      )
    } finally {
      await session.close()
    }
  },

  // Mirrors syncInteraction's action->relType mapping so callers can undo a
  // toggle (e.g. unliking a repo) without needing to know the Cypher rel type.
  async removeInteraction(userGithubId: number, repoId: string, action: string) {
    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
      let relType = 'INTERACTED_WITH'
      if (action === 'STARRED') relType = 'STARRED'
      else if (action === 'CONTRIBUTED_TO' || action === 'CONTRIBUTION') relType = 'CONTRIBUTED_TO'
      else if (action === 'OWNS') relType = 'OWNS'

      await session.run(
        `
        MATCH (u:User {githubId: $userGithubId})-[rel:${relType}]->(r:Repository {id: $repoId})
        DELETE rel
        `,
        { userGithubId, repoId }
      )
    } finally {
      await session.close()
    }
  },

  async syncUserSkills(userGithubId: number, skills: { name: string; proficiencyScore: number }[]) {
    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
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
    } finally {
      await session.close()
    }
  },

  async syncRepositoryTechStack(repoId: string, data: { languages: Record<string, number>, frameworks: string[], techStack: string[], ciCd: string[] }) {
    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
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
    } finally {
      await session.close()
    }
  },

  async syncRepositoryTopics(repoId: string, topics: string[]) {
    if (!topics.length) return

    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
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
    } finally {
      await session.close()
    }
  }
}
