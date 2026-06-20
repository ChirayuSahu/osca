import { Queue, type DefaultJobOptions } from 'bullmq'
import { getRedisConnectionOptions } from './redis'

// ─── Queue Name Constants ────────────────────────────────────────

export const QUEUE_NAMES = {
  CONTRIBUTOR_ANALYSIS: 'contributor-analysis',
  REPOSITORY_ANALYSIS: 'repository-analysis'
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// ─── Default Job Options ─────────────────────────────────────────

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000 // 5s → 10s → 20s
  },
  removeOnComplete: {
    age: 24 * 3600,  // Keep completed jobs for 24 hours
    count: 1000       // Keep at most 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600 // Keep failed jobs for 7 days
  }
}

// ─── Lazy-Initialized Queue Singletons ───────────────────────────

const queues = new Map<string, Queue>()

export const getQueue = (name: QueueName): Queue => {
  let queue = queues.get(name)
  if (!queue) {
    queue = new Queue(name, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions
    })
    queues.set(name, queue)
  }
  return queue
}

/**
 * Close all queue connections gracefully.
 */
export const closeAllQueues = async (): Promise<void> => {
  const closePromises = Array.from(queues.values()).map((q) => q.close())
  await Promise.all(closePromises)
  queues.clear()
}
