import { Worker, Job } from 'bullmq'
import { config } from '../config'
import { MAINTENANCE_QUEUE, getQueue } from '../config/queue'
import { getRedisConnectionOptions } from '../config/redis'
import { prisma } from '../utils/prisma'
import { JobEnqueueService } from '../services/job-enqueue.service'
import { DEFAULT_LANGUAGES, DEFAULT_TOPICS, discoverRepositories } from '../services/catalogue-discovery.service'
import { syncContributions } from '../services/contribution-tracking.service'

// Keeps the catalogue fresh, on the server GITHUB_TOKEN:
// - nightly, re-checks the repos with the oldest signals (newcomer signals,
//   activity, archived state; also fills in keywords for older repos)
// - weekly, adds newly active beginner-friendly repos
// Both only queue repository-analysis jobs; that worker does the GitHub work and
// waits out rate limits.

const REFRESH_BATCH = 150
const SCHEDULES = [
  { id: 'refresh-stale', pattern: '0 3 * * *' }, // 03:00 daily
  { id: 'discover', pattern: '0 4 * * 1' }, // 04:00 Mondays
  { id: 'sync-contributions', pattern: '30 5 * * *' } // 05:30 daily
]

const ACTIVE_WITHIN_MS = 30 * 24 * 60 * 60 * 1000

// Public PRs of everyone active in the last month (their own tokens, one
// GraphQL call each); people whose token GitHub rejected are skipped until
// they reconnect
const syncAllContributions = async (): Promise<number> => {
  const active = await prisma.recommendationEvent.findMany({
    where: { createdAt: { gte: new Date(Date.now() - ACTIVE_WITHIN_MS) }, user: { githubTokenInvalidAt: null } },
    distinct: ['userId'],
    select: { userId: true }
  })
  for (const { userId } of active) {
    await syncContributions(userId).catch((error) => console.error(`[CatalogueWorker] Contribution sync failed for ${userId}:`, error))
  }
  return active.length
}

const refreshStale = async (): Promise<number> => {
  const repos = await prisma.repository.findMany({
    where: { hidden: false },
    orderBy: [{ approachabilityUpdatedAt: { sort: 'asc', nulls: 'first' } }],
    take: REFRESH_BATCH,
    select: { url: true }
  })
  for (const repo of repos) await JobEnqueueService.enqueueRepositoryAnalysis(repo.url)
  return repos.length
}

const discover = async (): Promise<number> => {
  if (!config.githubServerToken) return 0
  const found = await discoverRepositories(
    { languages: DEFAULT_LANGUAGES, topics: DEFAULT_TOPICS, perLanguage: 10, activePerLanguage: 5, perTopic: 5, minGoodFirstIssues: 5, pushedWithinDays: 60 },
    config.githubServerToken
  )
  const existing = new Set((await prisma.repository.findMany({ select: { fullName: true } })).map(r => r.fullName.toLowerCase()))
  const fresh = [...found.keys()].filter(name => !existing.has(name))
  for (const fullName of fresh) await JobEnqueueService.enqueueRepositoryAnalysis(`https://github.com/${fullName}`)
  return fresh.length
}

const processMaintenanceJob = async (job: Job): Promise<{ count: number }> => {
  if (job.name === 'sync-contributions') {
    const count = await syncAllContributions()
    console.log(`[CatalogueWorker] sync-contributions: checked ${count} users`)
    return { count }
  }
  const count = job.name === 'discover' ? await discover() : await refreshStale()
  console.log(`[CatalogueWorker] ${job.name}: queued ${count} repository analyses`)
  return { count }
}

export const createCatalogueWorker = (): Worker => {
  const worker = new Worker(MAINTENANCE_QUEUE, processMaintenanceJob, {
    connection: getRedisConnectionOptions(),
    concurrency: 1,
    drainDelay: 5000
  })
  worker.on('failed', (job, err) => console.error(`[CatalogueWorker] ${job?.name} failed: ${err.message}`))
  worker.on('error', (err) => console.error('[CatalogueWorker] Worker error:', err.message))
  return worker
}

/** Adds (or, when maintenance is off, removes) the nightly and weekly schedules */
export const syncCatalogueSchedules = async (): Promise<void> => {
  const queue = getQueue(MAINTENANCE_QUEUE)
  for (const { id, pattern } of SCHEDULES) {
    if (config.catalogueMaintenance) await queue.upsertJobScheduler(id, { pattern }, { name: id })
    else await queue.removeJobScheduler(id)
  }
  console.log(`[CatalogueWorker] Catalogue maintenance ${config.catalogueMaintenance ? 'scheduled' : 'off'}`)
}
