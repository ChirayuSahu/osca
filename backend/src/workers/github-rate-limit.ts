import { DelayedError, Job, Worker } from 'bullmq'
import { GithubRateLimitError } from '../lib/errors'

type Processor<D, R> = (job: Job<D, R>, token?: string) => Promise<R>

/**
 * Wraps a processor so a GitHub rate limit waits for the budget to reset
 * instead of failing the job or spending its retries.
 *
 * - `queue`: the token is shared by every job (the server token), so the whole
 *   queue pauses until the reset and the job goes back to waiting.
 * - `job`: each job has its own token (a user's), so only that job is delayed.
 */
export const waitOnGithubRateLimit = <D, R>(
  scope: 'queue' | 'job',
  getWorker: () => Worker<D, R>,
  process: Processor<D, R>
): Processor<D, R> => async (job, token) => {
  try {
    return await process(job, token)
  } catch (error) {
    if (!(error instanceof GithubRateLimitError)) throw error

    const waitMs = Math.max(1000, error.retryAt - Date.now())
    console.warn(`[${job.queueName}] GitHub rate limit; ${scope === 'queue' ? 'pausing the queue' : `delaying job ${job.id}`} for ${Math.ceil(waitMs / 1000)}s`)
    if (scope === 'queue') {
      await getWorker().rateLimit(waitMs)
      throw Worker.RateLimitError()
    }
    await job.moveToDelayed(Date.now() + waitMs, token)
    throw new DelayedError()
  }
}
