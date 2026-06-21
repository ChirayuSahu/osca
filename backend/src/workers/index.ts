import { Worker } from 'bullmq'
import { createContributorWorker } from './contributor-analysis.worker'
import { createRepositoryWorker } from './repository-analysis.worker'

// ─── Worker Registry ─────────────────────────────────────────────

const workers: Worker[] = []

/**
 * Initialize all BullMQ workers.
 * Call this once when the server starts.
 */
export const initWorkers = (): void => {
  console.log('[Workers] Initializing all workers...')

  try {
    workers.push(createContributorWorker())
    workers.push(createRepositoryWorker())
    console.log(`[Workers] ${workers.length} workers initialized successfully`)
  } catch (error) {
    console.error('[Workers] Failed to initialize workers:', error)
    // Don't crash the server — the API can still serve non-queue routes
    // Workers will retry connecting to Redis automatically
  }
}

/**
 * Gracefully shut down all workers.
 * Waits for active jobs to finish before closing.
 */
export const shutdownWorkers = async (): Promise<void> => {
  console.log('[Workers] Shutting down workers gracefully...')

  const closePromises = workers.map(async (worker) => {
    try {
      await worker.close()
      console.log(`[Workers] Worker "${worker.name}" closed`)
    } catch (error) {
      console.error(`[Workers] Error closing worker "${worker.name}":`, error)
    }
  })

  await Promise.all(closePromises)
  workers.length = 0
  console.log('[Workers] All workers shut down')
}
