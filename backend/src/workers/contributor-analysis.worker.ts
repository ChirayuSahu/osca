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

  // #E-6: Explicit try/catch so we can log context before rethrowing to BullMQ
  try {
    const skills = await ContributorAnalysisService.analyzeProfile(userId, async (percent, message) => {
      await job.updateProgress({ percent, message })
    })

    console.log(`[ContributorWorker] Job ${job.id} complete — ${skills.length} skills extracted`)
    return {
      userId,
      skillCount: skills.length,
      skills
    }
  } catch (error) {
    console.error(`[ContributorWorker] Job ${job.id} failed for user ${userId}:`, error)
    throw error
  }
}

export const createContributorWorker = (): Worker => {
  const worker = new Worker<ContributorAnalysisJobData, ContributorAnalysisJobResult>(
    QUEUE_NAMES.CONTRIBUTOR_ANALYSIS,
    processContributorAnalysis,
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
