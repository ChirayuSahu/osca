/**
 * Cancel all jobs in one or more queues.
 *
 * Usage:
 *   npm run cancel-jobs                     # Cancel all repository-analysis jobs (default)
 *   npm run cancel-jobs -- --repos          # Cancel all repository-analysis jobs
 *   npm run cancel-jobs -- --users          # Cancel all contributor-analysis jobs
 *   npm run cancel-jobs -- --repos --users  # Cancel both queues
 */
import { Queue } from 'bullmq'
import { QUEUE_NAMES, getQueue, closeAllQueues } from '../src/config/queue'

const cancelQueue = async (queue: Queue, label: string): Promise<void> => {
  console.log(`\n[CancelJobs] ── ${label} ──`)

  // 1. Drain: remove all waiting + delayed jobs atomically
  await queue.drain()
  console.log(`[CancelJobs] Drained waiting/delayed jobs`)

  // 2. Get active jobs and forcefully fail them
  const activeJobs = await queue.getJobs(['active'])
  console.log(`[CancelJobs] Found ${activeJobs.length} active job(s)`)

  let cancelled = 0
  for (const job of activeJobs) {
    try {
      await job.moveToFailed(new Error('Cancelled by admin via cancel-jobs script'), '0', true)
      console.log(`[CancelJobs] Cancelled active job ${job.id}`)
      cancelled++
    } catch (err: any) {
      // Job may have already finished between listing and cancelling
      console.warn(`[CancelJobs] Could not cancel job ${job.id}: ${err.message}`)
    }
  }

  // 3. Print final queue state
  const counts = await queue.getJobCounts('waiting', 'delayed', 'active', 'failed', 'completed')
  console.log(`[CancelJobs] Queue state after cancel:`, counts)
  console.log(`[CancelJobs] Done — cancelled ${cancelled} active job(s) and drained queue`)
}

const main = async () => {
  const args = process.argv.slice(2)
  // Default to --repos if no flags given
  const hasRepos = args.includes('--repos') || args.length === 0
  const hasUsers = args.includes('--users')

  if (hasRepos) {
    const queue = getQueue(QUEUE_NAMES.REPOSITORY_ANALYSIS)
    await cancelQueue(queue, `Queue: ${QUEUE_NAMES.REPOSITORY_ANALYSIS}`)
  }

  if (hasUsers) {
    const queue = getQueue(QUEUE_NAMES.CONTRIBUTOR_ANALYSIS)
    await cancelQueue(queue, `Queue: ${QUEUE_NAMES.CONTRIBUTOR_ANALYSIS}`)
  }

  await closeAllQueues()
  console.log('\n[CancelJobs] All done.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[CancelJobs] Fatal error:', err)
    process.exit(1)
  })
