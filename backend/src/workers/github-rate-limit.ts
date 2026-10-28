import { DelayedError, Job, Worker, type RateLimiterOptions } from 'bullmq'
import { GithubRateLimitError } from '../lib/errors'

type Processor<D, R> = (job: Job<D, R>, token?: string) => Promise<R>

/**
 * BullMQ only honours a queue-wide rate limit (`worker.rateLimit`) when the
 * worker has a limiter, so a worker using the 'queue' scope must pass this as
 * its `limiter`. The cap itself is far above what the workers ever reach.
 */
export const GITHUB_QUEUE_LIMITER: RateLimiterOptions = { max: 1000, duration: 1000 }

// When each token's budget comes back, by token key (this process only), so
// later jobs on a limited token wait without calling GitHub first
const limitedUntil = new Map<string, number>()

const delayJob = async (job: Job, token: string | undefined, until: number, reason: string): Promise<never> => {
  console.warn(`[${job.queueName}] ${reason}; delaying job ${job.id} for ${Math.ceil((until - Date.now()) / 1000)}s`)
  await job.moveToDelayed(until, token)
  throw new DelayedError()
}

/**
 * Wraps a processor so a GitHub rate limit waits for the budget to reset
 * instead of failing the job or spending its retries.
 *
 * - `queue`: every job shares one token, so the whole queue pauses until the
 *   reset and the job goes back to waiting. Needs `limiter: GITHUB_QUEUE_LIMITER`.
 * - `job`: jobs carry different tokens (a user's, or the server's), so only jobs
 *   on the limited token are delayed; `tokenKey` says which token a job uses.
 *   One user's exhausted token never holds up anyone else's jobs.
 */
export const waitOnGithubRateLimit = <D, R>(
  scope: 'queue' | 'job',
  getWorker: () => Worker<D, R>,
  process: Processor<D, R>,
  tokenKey: (job: Job<D, R>) => string = (job) => `job:${job.id}`
): Processor<D, R> => async (job, token) => {
  const key = tokenKey(job)
  if (scope === 'job') {
    const until = limitedUntil.get(key) ?? 0
    if (until > Date.now()) return delayJob(job, token, until, 'GitHub token still rate limited')
    limitedUntil.delete(key)
  }

  try {
    return await process(job, token)
  } catch (error) {
    if (!(error instanceof GithubRateLimitError)) throw error

    const until = Math.max(Date.now() + 1000, error.retryAt)
    if (scope === 'queue') {
      const waitMs = until - Date.now()
      console.warn(`[${job.queueName}] GitHub rate limit; pausing the queue for ${Math.ceil(waitMs / 1000)}s`)
      await getWorker().rateLimit(waitMs)
      throw Worker.RateLimitError()
    }
    limitedUntil.set(key, until)
    return delayJob(job, token, until, 'GitHub rate limit')
  }
}
