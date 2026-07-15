import neo4j from 'neo4j-driver'
import { config } from '../config'

export const neo4jDriver = neo4j.driver(
  config.neo4j.uri,
  neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
)

export const initNeo4j = async () => {
  try {
    await neo4jDriver.verifyConnectivity()
    console.log('[Neo4j] Successfully connected to Graph Database')

    // Initialize constraints (ignoring errors if they already exist)
    const session = neo4jDriver.session({ database: config.neo4j.database })
    try {
      await session.run(`CREATE CONSTRAINT user_github_id IF NOT EXISTS FOR (u:User) REQUIRE u.githubId IS UNIQUE`)
      await session.run(`CREATE CONSTRAINT repo_id IF NOT EXISTS FOR (r:Repository) REQUIRE r.id IS UNIQUE`)
      await session.run(`CREATE CONSTRAINT lang_name IF NOT EXISTS FOR (l:Language) REQUIRE l.name IS UNIQUE`)
      await session.run(`CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE`)
      await session.run(`CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE`)
      await session.run(`CREATE CONSTRAINT org_name IF NOT EXISTS FOR (o:Organization) REQUIRE o.name IS UNIQUE`)
    } finally {
      await session.close()
    }
  } catch (error) {
    console.error('[Neo4j] Connection failed:', error)
  }
}
