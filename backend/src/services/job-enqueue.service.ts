import { createHash } from 'crypto'
import { getQueue, QUEUE_NAMES, type QueueName } from '../config/queue'
import type {
  ContributorAnalysisJobData,
  QueuedJobResponse,
  RepositoryAnalysisJobData
} from '../types/jobs'

const buildStatusUrl = (queue: QueueName, jobId: string): string =>
  `/api/v1/jobs/${queue}/${jobId}`

// #18: Deterministic job ID so the same logical work is never enqueued twice.
// BullMQ deduplicates by jobId — if a job with this ID is already active or
// waiting, `queue.add()` returns the existing job instead of creating a new one.
const deterministicJobId = (namespace: string, key: string): string =>
  createHash('sha256').update(`${namespace}:${key}`).digest('hex').substring(0, 32)

const enqueue = async (
  queueName: QueueName,
  jobName: string,
  data: RepositoryAnalysisJobData | ContributorAnalysisJobData,
  jobId: string
): Promise<QueuedJobResponse> => {
  const queue = getQueue(queueName)

  // Check if the job is already active or waiting (idempotency guard)
  const existingJob = await queue.getJob(jobId)
  if (existingJob) {
    const state = await existingJob.getState()
    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      console.log(`[JobEnqueue] Job ${jobId} already ${state} — skipping enqueue`)
      return {
        jobId,
        queue: queueName,
        statusUrl: buildStatusUrl(queueName, jobId),
        alreadyQueued: true
      }
    }
  }

  const job = await queue.add(jobName, data, { jobId })

  // #26: job.id should always match jobId we passed in, but guard defensively
  const resolvedId = job.id
  if (!resolvedId) {
    throw new Error(`[JobEnqueue] BullMQ returned undefined job.id for queue ${queueName}`)
  }

  return {
    jobId: resolvedId,
    queue: queueName,
    statusUrl: buildStatusUrl(queueName, resolvedId)
  }
}

export const JobEnqueueService = {
  enqueueRepositoryAnalysis: (url: string, userId: string, force: boolean = false) => {
    let jobKey = `${userId}:${url}`
    if (force) jobKey += ':force'
    const jobId = deterministicJobId('repo-analysis', jobKey)
    return enqueue(QUEUE_NAMES.REPOSITORY_ANALYSIS, 'analyze-repository', { url, userId, force }, jobId)
  },

  enqueueContributorAnalysis: (userId: string) => {
    // One active contributor analysis job per user at a time
    const jobId = deterministicJobId('contributor-analysis', userId)
    return enqueue(QUEUE_NAMES.CONTRIBUTOR_ANALYSIS, 'analyze-contributor', { userId }, jobId)
  }
}
