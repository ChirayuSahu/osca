import { Worker, Job, UnrecoverableError } from 'bullmq'
import { isPermanentJobError } from '../lib/errors'
import { waitOnGithubRateLimit } from './github-rate-limit'
import { syncUserInterestAreas, syncUserRepoKeywords } from '../services/user-keywords.service'
import { QUEUE_NAMES } from '../config/queue'
import { getRedisConnectionOptions } from '../config/redis'
import { ContributorAnalysisService } from '../services/contributor-analysis.service'
import { Neo4jSyncService } from '../services/neo4j-sync.service'
import { prisma } from '../utils/prisma'
import type { ContributorAnalysisJobData, ContributorAnalysisJobResult } from '../types/jobs'

const processContributorAnalysis = async (
  job: Job<ContributorAnalysisJobData, ContributorAnalysisJobResult>
): Promise<ContributorAnalysisJobResult> => {
  const { userId } = job.data

  console.log(`[ContributorWorker] Starting analysis for user ${userId} (job ${job.id})`)

  // #E-6: Explicit try/catch so we can log context before rethrowing to BullMQ
  try {
    const analyzed = await ContributorAnalysisService.analyzeProfile(userId, async (percent, message) => {
      await job.updateProgress({ percent, message })
    })

    // Sync to Neo4j before scoring, so finalizeContributorProfile can read
    // this user's up-to-date graph footprint.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, oauthAccounts: { where: { provider: 'github' } } }
    })

    let githubId: number | null = null
    if (user && user.oauthAccounts[0]?.providerId) {
      const parsedId = parseInt(user.oauthAccounts[0].providerId, 10)
      if (!isNaN(parsedId)) {
        githubId = parsedId
        await Neo4jSyncService.syncUser({ githubId, username: user.username })
        await Neo4jSyncService.syncUserSkills(githubId, analyzed.skills)

        try {
          const starredCount = await ContributorAnalysisService.syncStarredRepositories(userId, githubId, user.username)
          console.log(`[ContributorWorker] Synced ${starredCount} STARRED edges for user ${userId}`)
        } catch (error) {
          console.error(`[ContributorWorker] Failed to sync starred repos for user ${userId}:`, error)
        }

        try {
          const ownedCount = await ContributorAnalysisService.syncOwnedRepositories(githubId, user.oauthAccounts[0].username)
          console.log(`[ContributorWorker] Synced ${ownedCount} OWNS edges for user ${userId}`)
        } catch (error) {
          console.error(`[ContributorWorker] Failed to sync owned repos for user ${userId}:`, error)
        }

        try {
          const keywordCount = await syncUserRepoKeywords(userId)
          await syncUserInterestAreas(userId)
          console.log(`[ContributorWorker] Synced ${keywordCount} interest keywords for user ${userId}`)
        } catch (error) {
          console.error(`[ContributorWorker] Failed to sync interest keywords for user ${userId}:`, error)
        }
      }
    }

    await job.updateProgress({ percent: 98, message: 'Scoring profile from graph data...' })
    const overallScore = await ContributorAnalysisService.finalizeContributorProfile(userId, githubId, analyzed)
    await job.updateProgress({ percent: 100, message: 'Profile analysis complete!' })

    console.log(`[ContributorWorker] Job ${job.id} complete — ${analyzed.skills.length} skills extracted, overall score ${overallScore.toFixed(1)}`)
    return {
      userId,
      skillCount: analyzed.skills.length,
      skills: analyzed.skills
    }
  } catch (error) {
    console.error(`[ContributorWorker] Job ${job.id} failed for user ${userId}:`, error)
    if (isPermanentJobError(error)) throw new UnrecoverableError((error as Error).message)
    throw error
  }
}

export const createContributorWorker = (): Worker => {
  const worker: Worker<ContributorAnalysisJobData, ContributorAnalysisJobResult> = new Worker<ContributorAnalysisJobData, ContributorAnalysisJobResult>(
    QUEUE_NAMES.CONTRIBUTOR_ANALYSIS,
    waitOnGithubRateLimit('job', () => worker, processContributorAnalysis),
    {
      connection: getRedisConnectionOptions(),
      concurrency: 3,
      // #J-2: removeOnComplete / removeOnFail omitted — controlled by queue defaultJobOptions
      // #J-3: 30s stall detection (was 5 min)
      stalledInterval: 30000,
      // #J-4: 5s drain delay (was 300ms)
      drainDelay: 5000,
      metrics: undefined
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[ContributorWorker] Job ${job?.id} failed: ${err.message}`)
  })

  worker.on('error', (err) => {
    console.error('[ContributorWorker] Worker error:', err.message)
  })

  console.log('[ContributorWorker] Worker started')

  return worker
}
