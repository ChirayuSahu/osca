import { Job } from 'bullmq'
import { getQueue, QUEUE_NAMES, type QueueName } from '../../config/queue'
import { AppError } from '../../lib/errors'

export interface JobStatus {
  jobId: string
  queue: string
  state: string
  progress: {
    percent: number
    message: string
  }
  result: unknown | null
  failedReason: string | null
  attemptsMade: number
  maxAttempts: number
  createdAt: number | undefined
  finishedAt: number | undefined
}

interface JobDataWithOwner {
  userId?: string
}

const VALID_QUEUES = new Set<string>(Object.values(QUEUE_NAMES))

export const isValidQueueName = (name: string): name is QueueName => VALID_QUEUES.has(name)

const getJobStatus = async (queueName: QueueName, jobId: string, requesterId: string): Promise<JobStatus> => {
  const queue = getQueue(queueName)
  const job = await Job.fromId(queue, jobId)

  if (!job) {
    throw new AppError(`Job "${jobId}" not found in queue "${queueName}"`, 404)
  }

  const ownerId = (job.data as JobDataWithOwner).userId
  if (ownerId && ownerId !== requesterId) {
    throw new AppError('Access denied. You can only view your own jobs.', 403)
  }

  const state = await job.getState()

  let progress = { percent: 0, message: 'Queued' }
  if (job.progress) {
    if (typeof job.progress === 'number') {
      progress = { percent: job.progress, message: '' }
    } else if (typeof job.progress === 'object') {
      const parsed = job.progress as { percent?: number; message?: string }
      progress = {
        percent: parsed.percent ?? 0,
        message: parsed.message ?? ''
      }
    }
  }

  if (state === 'completed') {
    progress = { percent: 100, message: 'Analysis complete' }
  } else if (state === 'failed') {
    progress.message = 'Analysis failed'
  } else if (state === 'waiting') {
    progress.message = 'Waiting in queue...'
  }

  return {
    jobId: job.id!,
    queue: queueName,
    state,
    progress,
    result: state === 'completed' ? job.returnvalue : null,
    failedReason: job.failedReason ?? null,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    createdAt: job.timestamp,
    finishedAt: job.finishedOn
  }
}

export const JobsService = {
  getJobStatus,
  isValidQueueName
}
