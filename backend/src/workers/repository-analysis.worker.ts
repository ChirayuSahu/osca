import { Worker, Job, UnrecoverableError } from 'bullmq'
import { GithubRateLimitError, isPermanentJobError } from '../lib/errors'
import { AnalysisRequestService } from '../services/analysis-request.service'
import { rebuildProfileIfOwnRepository } from '../services/profile-refresh.service'
import { waitOnGithubRateLimit } from './github-rate-limit'
import { QUEUE_NAMES } from '../config/queue'
import { getRedisConnectionOptions } from '../config/redis'
import { RepositoryAnalysisService } from '../services/repository-analysis.service'
import { Neo4jSyncService } from '../services/neo4j-sync.service'
import { prisma } from '../utils/prisma'
import type { RepositoryAnalysisJobData, RepositoryAnalysisJobResult } from '../types/jobs'

// What the Imported page shows when an analysis fails for good
const friendlyAnalysisError = (error: any): string => {
  const status = error?.statusCode
  if (status === 404) return 'Repository not found, or it is private.'
  if (status === 403) return 'GitHub refused access. Reconnect GitHub and try again.'
  if (status === 400) return String(error?.message || 'Invalid repository URL.')
  return 'The analysis failed. Try again in a few minutes.'
}

const processRepositoryAnalysis = async (
  job: Job<RepositoryAnalysisJobData, RepositoryAnalysisJobResult>
): Promise<RepositoryAnalysisJobResult> => {
  const { url, userId, force } = job.data

  console.log(`\n[RepositoryWorker] Starting job ${job.id} for ${url} (force: ${!!force})`)
  await AnalysisRequestService.setStatus(userId, url, 'analyzing').catch(() => {})

  try {
    const repository = await RepositoryAnalysisService.analyzeRepository(url, userId, async (percent, message) => {
      await job.updateProgress({ percent, message })
    }, force ?? false)

    const languages = repository.languages as Record<string, number> | null

    // Sync to Neo4j
    await Neo4jSyncService.syncRepository({
      id: repository.id,
      name: repository.name,
      owner: repository.owner,
      description: repository.description,
      stars: repository.stars,
      goodFirstIssueCount: repository.goodFirstIssueCount,
      helpWantedCount: repository.helpWantedCount,
      hasContributingGuide: repository.hasContributingGuide,
      archived: repository.archived,
      pushedAt: repository.pushedAt,
      outsidePrMergeRate: repository.outsidePrMergeRate,
      outsidePrsMerged90d: repository.outsidePrsMerged90d,
      maintainerResponseHours: repository.maintainerResponseHours,
      unclaimedStarterIssues: repository.unclaimedStarterIssues
    })

    await Neo4jSyncService.syncRepositoryTechStack(repository.id, {
      languages: languages || {},
      frameworks: repository.frameworks,
      techStack: repository.techStack,
      ciCd: repository.ciCd
    })

    await Neo4jSyncService.syncRepositoryTopics(repository.id, repository.topics)
    await Neo4jSyncService.syncRepositoryKeywords(repository.id, repository.keywords)

    // A user-initiated analysis is an import: list it under that user's
    // Imported Repos. System (seed) jobs have no user and import nothing.
    if (userId) {
      await prisma.repositoryImport.upsert({
        where: { userId_repositoryId: { userId, repositoryId: repository.id } },
        create: { userId, repositoryId: repository.id },
        update: {}
      })
      await rebuildProfileIfOwnRepository(userId, repository).catch((error) => {
        console.error(`[RepositoryWorker:${job.id}] Failed to queue profile rebuild:`, error)
      })
    }

    await AnalysisRequestService.setStatus(userId, url, 'done', { repositoryId: repository.id }).catch(() => {})
    console.log(`[RepositoryWorker:${job.id}] Job complete for ${repository.fullName}`)
    return {
      repositoryId: repository.id,
      name: repository.name,
      url: repository.url,
      languageCount: languages !== null ? Object.keys(languages).length : 0,
      frameworkCount: repository.frameworks.length
    }
  } catch (error: any) {
    const reason = error?.message || error
    console.error(`[RepositoryWorker:${job.id}] Job failed for ${url}. Reason:`, reason)
    // Failed for good, or going back in the queue (retry, or waiting out a rate limit)
    const final = !(error instanceof GithubRateLimitError) &&
      (isPermanentJobError(error) || job.attemptsMade + 1 >= (job.opts.attempts ?? 1))
    await AnalysisRequestService.setStatus(userId, url, final ? 'failed' : 'queued', {
      error: final ? friendlyAnalysisError(error) : null
    }).catch(() => {})
    if (isPermanentJobError(error)) throw new UnrecoverableError(error.message)
    throw error
  }
}

export const createRepositoryWorker = (): Worker => {
  const worker: Worker<RepositoryAnalysisJobData, RepositoryAnalysisJobResult> = new Worker<RepositoryAnalysisJobData, RepositoryAnalysisJobResult>(
    QUEUE_NAMES.REPOSITORY_ANALYSIS,
    waitOnGithubRateLimit('queue', () => worker, processRepositoryAnalysis),
    {
      connection: getRedisConnectionOptions(),
      concurrency: 2,
      // #J-2: removeOnComplete / removeOnFail omitted here — controlled by
      // queue-level defaultJobOptions in config/queue.ts to avoid override conflicts.
      // #J-3: 30s stall detection (was 5 min) — catches crashed workers faster
      stalledInterval: 30000,
      // #J-4: 5s drain delay (was 300ms) — prevents busy-polling when queue is empty
      drainDelay: 5000,
      metrics: undefined
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[RepositoryWorker] Job ${job?.id} failed: ${err.message}`)
    // Covers failures the processor never saw (e.g. stalled past BullMQ's limit),
    // so a request can't sit at "analyzing" for good
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      AnalysisRequestService.setStatus(job.data.userId, job.data.url, 'failed', {
        error: friendlyAnalysisError(err)
      }).catch(() => {})
    }
  })

  worker.on('error', (err) => {
    console.error('[RepositoryWorker] Worker error:', err.message)
  })

  console.log('[RepositoryWorker] Worker started')

  return worker
}
