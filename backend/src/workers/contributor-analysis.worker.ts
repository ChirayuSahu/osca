import { Worker, Job } from 'bullmq'
import { QUEUE_NAMES } from '../config/queue'
import { getRedisConnectionOptions } from '../config/redis'
import { ContributorAnalysisService } from '../services/contributor-analysis.service'
import type { ContributorAnalysisJobData, ContributorAnalysisJobResult } from '../types/jobs'

const processContributorAnalysis = async (
  job: Job<ContributorAnalysisJobData, ContributorAnalysisJobResult>
): Promise<ContributorAnalysisJobResult> => {
  const { userId } = job.data

  console.log(`[ContributorWorker] Starting analysis for user ${userId} (job ${job.id})`)

  const skills = await ContributorAnalysisService.analyzeProfile(userId, async (percent, message) => {
    await job.updateProgress({ percent, message })
  })

  return {
    userId,
    skillCount: skills.length,
    skills
  }
}

export const createContributorWorker = (): Worker => {
  const worker = new Worker<ContributorAnalysisJobData, ContributorAnalysisJobResult>(
    QUEUE_NAMES.CONTRIBUTOR_ANALYSIS,
    processContributorAnalysis,
    {
      connection: getRedisConnectionOptions(),
      concurrency: 3,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
      settings: {
        stalledInterval: 300000,
        drainDelay: 300,
      },
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
