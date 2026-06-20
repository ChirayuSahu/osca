import { Worker, Job } from 'bullmq'
import { QUEUE_NAMES } from '../config/queue'
import { getRedisConnectionOptions } from '../config/redis'
import { RepositoryAnalysisService } from '../services/repository-analysis.service'
import type { RepositoryAnalysisJobData, RepositoryAnalysisJobResult } from '../types/jobs'

const processRepositoryAnalysis = async (
  job: Job<RepositoryAnalysisJobData, RepositoryAnalysisJobResult>
): Promise<RepositoryAnalysisJobResult> => {
  const { url, userId } = job.data

  console.log(`[RepositoryWorker] Starting analysis for ${url} (job ${job.id})`)

  const repository = await RepositoryAnalysisService.analyzeRepository(url, userId, async (percent, message) => {
    await job.updateProgress({ percent, message })
  })

  const languages = repository.languages as Record<string, number> | null

  return {
    repositoryId: repository.id,
    name: repository.name,
    url: repository.url,
    languageCount: languages !== null ? Object.keys(languages).length : 0,
    frameworkCount: repository.frameworks.length,
    openIssues: repository.openIssues
  }
}

export const createRepositoryWorker = (): Worker => {
  const worker = new Worker<RepositoryAnalysisJobData, RepositoryAnalysisJobResult>(
    QUEUE_NAMES.REPOSITORY_ANALYSIS,
    processRepositoryAnalysis,
    {
      connection: getRedisConnectionOptions(),
      concurrency: 2,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 }
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
