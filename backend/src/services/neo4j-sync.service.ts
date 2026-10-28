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

const relTypeFor = (action: string): string => {
  if (action === 'STARRED') return 'STARRED'
  if (action === 'CONTRIBUTED_TO' || action === 'CONTRIBUTION') return 'CONTRIBUTED_TO'
  if (action === 'OWNS') return 'OWNS'
  // Negative feedback: its own edge type so it never counts as a positive
  // co-interaction in collaborative filtering.
  if (action === 'REPOSITORY_NOT_INTERESTED') return 'NOT_INTERESTED'
  return 'INTERACTED_WITH'
}

export const Neo4jSyncService = {
  // Removes the user and every edge to them (skills, stars, likes, not-for-me)
  async deleteUser(githubId: number) {
    await withSession(session =>
      session.run('MATCH (u:User {githubId: $githubId}) DETACH DELETE u', { githubId })
    )
  },

  // Removes the repository and every edge to it (stars, likes, tech stack, topics)
  async removeRepository(id: string) {
    await withSession(session =>
      session.run('MATCH (r:Repository {id: $id}) DETACH DELETE r', { id })
    )
  },

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
    goodFirstIssueCount?: number;
    helpWantedCount?: number;
    hasContributingGuide?: boolean;
    archived?: boolean;
    pushedAt?: Date | null;
    outsidePrMergeRate?: number | null;
    outsidePrsMerged90d?: number | null;
    maintainerResponseHours?: number | null;
    unclaimedStarterIssues?: number | null;
  }) {
    await withSession(session =>
      session.run(
        `
        MERGE (r:Repository {id: $id})
        SET r.name = $name,
            r.owner = $owner,
            r.description = $description,
            r.stars = $stars,
            r.goodFirstIssues = $goodFirstIssues,
            r.helpWanted = $helpWanted,
            r.hasContributing = $hasContributing,
            r.archived = $archived,
            r.pushedAt = $pushedAt,
            r.outsideMergeRate = $outsideMergeRate,
            r.outsideMerged90d = $outsideMerged90d,
            r.responseHours = $responseHours,
            r.unclaimedStarters = $unclaimedStarters
        `,
        {
          id: repo.id,
          name: repo.name,
          owner: repo.owner,
          description: repo.description ?? '',
          stars: repo.stars ?? 0,
          goodFirstIssues: repo.goodFirstIssueCount ?? 0,
          helpWanted: repo.helpWantedCount ?? 0,
          hasContributing: repo.hasContributingGuide ?? false,
          archived: repo.archived ?? false,
          // epoch ms; null when unknown
          pushedAt: repo.pushedAt ? repo.pushedAt.getTime() : null,
          // null = not measured yet; scoring treats that as neutral
          outsideMergeRate: repo.outsidePrMergeRate ?? null,
          outsideMerged90d: repo.outsidePrsMerged90d ?? null,
          responseHours: repo.maintainerResponseHours ?? null,
          unclaimedStarters: repo.unclaimedStarterIssues ?? null
        }
      )
    )
  },

  async syncInteraction(userGithubId: number, repoId: string, action: string) {
    const relType = relTypeFor(action)

    // INTERACTED_WITH edges are keyed by action so undoing one (e.g. unliking)
    // doesn't erase the user's other history with the same repo.
    const relPattern = relType === 'INTERACTED_WITH'
      ? 'MERGE (u)-[rel:INTERACTED_WITH {action: $action}]->(r)'
      : `MERGE (u)-[rel:${relType}]->(r)`

    await withSession(session =>
      session.run(
        `
        MATCH (u:User {githubId: $userGithubId})
        MATCH (r:Repository {id: $repoId})
        ${relPattern}
        SET rel.updatedAt = datetime()
        `,
        { userGithubId, repoId, action }
      )
    )
  },

  // Mirrors syncInteraction's action->relType mapping so callers can undo a
  // toggle (e.g. unliking a repo) without needing to know the Cypher rel type.
  async removeInteraction(userGithubId: number, repoId: string, action: string) {
    const relType = relTypeFor(action)

    // Edges written before actions were recorded have no `action`; they can't
    // be attributed, so they go too (matching the old behaviour).
    const actionFilter = relType === 'INTERACTED_WITH'
      ? 'WHERE rel.action = $action OR rel.action IS NULL'
      : ''

    await withSession(session =>
      session.run(
        `
        MATCH (u:User {githubId: $userGithubId})-[rel:${relType}]->(r:Repository {id: $repoId})
        ${actionFilter}
        DELETE rel
        `,
        { userGithubId, repoId, action }
      )
    )
  },

  // Replaces the user's skill edges wholesale so skills dropped by a
  // re-analysis stop driving recommendations.
  async syncUserSkills(userGithubId: number, skills: { name: string; proficiencyScore: number }[]) {
    await withSession(session =>
      session.executeWrite(async tx => {
        await tx.run(
          `
          MATCH (u:User {githubId: $userGithubId})-[rel:HAS_SKILL]->(s:Skill)
          WHERE NOT s.name IN $skillNames
          DELETE rel
          `,
          { userGithubId, skillNames: skills.map(skill => skill.name) }
        )
        await tx.run(
          `
          MATCH (u:User {githubId: $userGithubId})
          UNWIND $skills AS skill
          MERGE (s:Skill {name: skill.name})
          MERGE (u)-[rel:HAS_SKILL]->(s)
          SET rel.score = skill.score
          `,
          {
            userGithubId,
            skills: skills.map(skill => ({ name: skill.name, score: skill.proficiencyScore }))
          }
        )
      })
    )
  },

  // Replaces the repo's language/framework/tool/CI edges so a re-analysis
  // reflects what the repo uses now, not everything it ever used.
  async syncRepositoryTechStack(repoId: string, data: { languages: Record<string, number>, frameworks: string[], techStack: string[], ciCd: string[] }) {
    const languages = Object.entries(data.languages).map(([name, bytes]) => ({ name, bytes }))
    const tools = data.techStack.filter(tech => !data.frameworks.includes(tech))

    await withSession(session =>
      session.executeWrite(async tx => {
        await tx.run(
          `
          MATCH (r:Repository {id: $repoId})-[rel:USES_LANGUAGE|USES_FRAMEWORK|USES_TOOL|USES_CI]->()
          DELETE rel
          `,
          { repoId }
        )
        await tx.run(
          `
          MATCH (r:Repository {id: $repoId})
          UNWIND $languages AS lang
          MERGE (l:Language {name: lang.name})
          MERGE (r)-[rel:USES_LANGUAGE]->(l)
          SET rel.bytes = lang.bytes
          `,
          { repoId, languages }
        )
        await tx.run(
          `
          MATCH (r:Repository {id: $repoId})
          UNWIND $frameworks AS framework
          MERGE (f:Framework {name: framework})
          MERGE (r)-[:USES_FRAMEWORK]->(f)
          `,
          { repoId, frameworks: data.frameworks }
        )
        await tx.run(
          `
          MATCH (r:Repository {id: $repoId})
          UNWIND $tools AS tech
          MERGE (t:Tool {name: tech})
          MERGE (r)-[:USES_TOOL]->(t)
          `,
          { repoId, tools }
        )
        await tx.run(
          `
          MATCH (r:Repository {id: $repoId})
          UNWIND $ciCd AS ci
          MERGE (c:CI_CD {name: ci})
          MERGE (r)-[:USES_CI]->(c)
          `,
          { repoId, ciCd: data.ciCd }
        )
      })
    )
  },

  // What the project is about (see lib/text/keywords); replaces the previous set
  async syncRepositoryKeywords(repoId: string, keywords: string[]) {
    await withSession(session =>
      session.executeWrite(async tx => {
        await tx.run(
          `MATCH (r:Repository {id: $repoId})-[rel:HAS_KEYWORD]->(k:Keyword) WHERE NOT k.name IN $keywords DELETE rel`,
          { repoId, keywords }
        )
        await tx.run(
          `MATCH (r:Repository {id: $repoId})
           UNWIND $keywords AS kw
           MERGE (k:Keyword {name: kw})
           MERGE (r)-[:HAS_KEYWORD]->(k)`,
          { repoId, keywords }
        )
      })
    )
  },

  // What a user builds or is interested in, by source ("repos" from their GitHub
  // repositories, "onboarding" from the interests they picked); each source is
  // replaced on its own so refreshing one keeps the other
  async syncUserKeywords(githubId: number, source: 'repos' | 'onboarding', keywords: Array<{ name: string; weight: number }>) {
    await withSession(session =>
      session.executeWrite(async tx => {
        await tx.run(
          `MATCH (u:User {githubId: $githubId})-[rel:INTERESTED_IN {source: $source}]->(:Keyword) DELETE rel`,
          { githubId, source }
        )
        await tx.run(
          `MATCH (u:User {githubId: $githubId})
           UNWIND $keywords AS kw
           MERGE (k:Keyword {name: kw.name})
           MERGE (u)-[i:INTERESTED_IN {source: $source}]->(k)
           SET i.weight = kw.weight`,
          { githubId, source, keywords }
        )
      })
    )
  },

  async syncRepositoryTopics(repoId: string, topics: string[]) {
    await withSession(session =>
      session.executeWrite(async tx => {
        await tx.run(
          `
          MATCH (r:Repository {id: $repoId})-[rel:HAS_TOPIC]->(t:Topic)
          WHERE NOT t.name IN $topics
          DELETE rel
          `,
          { repoId, topics }
        )
        await tx.run(
          `
          MATCH (r:Repository {id: $repoId})
          UNWIND $topics AS topic
          MERGE (t:Topic {name: topic})
          MERGE (r)-[:HAS_TOPIC]->(t)
          `,
          { repoId, topics }
        )
      })
    )
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
