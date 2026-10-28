import { Worker, Job, UnrecoverableError } from 'bullmq'
import { isPermanentJobError } from '../lib/errors'
import { waitOnGithubRateLimit } from './github-rate-limit'
import { QUEUE_NAMES } from '../config/queue'
import { getRedisConnectionOptions } from '../config/redis'
import { RepositoryAnalysisService } from '../services/repository-analysis.service'
import { Neo4jSyncService } from '../services/neo4j-sync.service'
import { prisma } from '../utils/prisma'
import type { RepositoryAnalysisJobData, RepositoryAnalysisJobResult } from '../types/jobs'

const processRepositoryAnalysis = async (
  job: Job<RepositoryAnalysisJobData, RepositoryAnalysisJobResult>
): Promise<RepositoryAnalysisJobResult> => {
  const { url, userId, force } = job.data

  console.log(`\n[RepositoryWorker] Starting job ${job.id} for ${url} (force: ${!!force})`)
  
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
      pushedAt: repository.pushedAt
    })

    await Neo4jSyncService.syncRepositoryTechStack(repository.id, {
      languages: languages || {},
      frameworks: repository.frameworks,
      techStack: repository.techStack,
      ciCd: repository.ciCd
    })

    await Neo4jSyncService.syncRepositoryTopics(repository.id, repository.topics)

    // A user-initiated analysis is an import: list it under that user's
    // Imported Repos. System (seed) jobs have no user and import nothing.
    if (userId) {
      await prisma.repositoryImport.upsert({
        where: { userId_repositoryId: { userId, repositoryId: repository.id } },
        create: { userId, repositoryId: repository.id },
        update: {}
      })
    }

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
  })

  worker.on('error', (err) => {
    console.error('[RepositoryWorker] Worker error:', err.message)
  })

  console.log('[RepositoryWorker] Worker started')

  return worker
}
