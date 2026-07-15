/**
 * One-off backfill for data that predates the Neo4j interaction/star sync
 * (see commits wiring InteractionService.logInteraction and
 * ContributorAnalysisService.syncStarredRepositories into Neo4j).
 *
 * Existing UserInteraction rows and existing users' GitHub stars were never
 * written to Neo4j, so the recommendation engine's collaborative-filtering
 * signal is empty for them until this runs once. Safe to re-run — every
 * write here is a Neo4j MERGE.
 *
 * Does NOT reanalyze repositories or re-run full contributor analysis (skills,
 * tech stack, etc.) — it only backfills the STARRED / INTERACTED_WITH /
 * CONTRIBUTED_TO edges those flows would otherwise leave missing.
 *
 * Usage: npm run backfill:neo4j
 */
import { prisma } from '../src/utils/prisma'
import { neo4jDriver } from '../src/utils/neo4j'
import { Neo4jSyncService } from '../src/services/neo4j-sync.service'
import { ContributorAnalysisService } from '../src/services/contributor-analysis.service'

const backfillInteractions = async () => {
  const interactions = await prisma.userInteraction.findMany({
    select: { userId: true, repositoryId: true, action: true },
    distinct: ['userId', 'repositoryId', 'action']
  })

  console.log(`[Backfill] Found ${interactions.length} distinct (user, repo, action) interactions to sync`)

  const githubIdCache = new Map<string, number | null>()
  let synced = 0
  let skipped = 0

  for (const interaction of interactions) {
    let githubId = githubIdCache.get(interaction.userId)
    if (githubId === undefined) {
      const account = await prisma.oAuthAccount.findFirst({
        where: { userId: interaction.userId, provider: 'github' },
        select: { providerId: true }
      })
      const parsed = account?.providerId ? parseInt(account.providerId, 10) : NaN
      githubId = isNaN(parsed) ? null : parsed
      githubIdCache.set(interaction.userId, githubId)
    }

    if (githubId === null) {
      skipped++
      continue
    }

    try {
      await Neo4jSyncService.syncInteraction(githubId, interaction.repositoryId, interaction.action)
      synced++
    } catch (err) {
      console.error(
        `[Backfill] Failed to sync interaction for user ${interaction.userId}, repo ${interaction.repositoryId}:`,
        err
      )
    }
  }

  console.log(`[Backfill] Interactions: synced ${synced}, skipped ${skipped} (no linked GitHub account)`)
}

const backfillStarredRepos = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      oauthAccounts: { where: { provider: 'github' }, select: { providerId: true } }
    }
  })

  console.log(`[Backfill] Found ${users.length} users to check for starred repos`)

  let processed = 0
  let skipped = 0

  for (const user of users) {
    const providerId = user.oauthAccounts[0]?.providerId
    const githubId = providerId ? parseInt(providerId, 10) : NaN

    if (!providerId || isNaN(githubId)) {
      skipped++
      continue
    }

    try {
      await Neo4jSyncService.syncUser({ githubId, username: user.username })
      const count = await ContributorAnalysisService.syncStarredRepositories(user.id, githubId, user.username)
      console.log(`[Backfill] ${user.username} — synced ${count} STARRED edges`)
      processed++
    } catch (err) {
      console.error(`[Backfill] Failed to sync starred repos for ${user.username}:`, err)
    }
  }

  console.log(`[Backfill] Starred repos: processed ${processed} users, skipped ${skipped} (no linked GitHub account)`)
}

const main = async () => {
  await backfillInteractions()
  await backfillStarredRepos()

  console.log('[Backfill] Done.')

  await neo4jDriver.close()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[Backfill] Fatal error:', err)
  process.exit(1)
})
