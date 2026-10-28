import { prisma } from '../utils/prisma'
import { parseGithubRepoUrl } from '../lib/github'
import { getQueue, QUEUE_NAMES } from '../config/queue'

export type AnalysisRequestStatus = 'queued' | 'analyzing' | 'done' | 'failed'

const fullNameOf = (url: string): string => {
  const { owner, repo } = parseGithubRepoUrl(url)
  return `${owner}/${repo}`
}

// Called before the job is queued, so the worker's status updates always find
// the row (a fast job can finish before the enqueue call returns). A request
// that's already being analyzed keeps that status instead of going back to queued.
const recordQueued = async (userId: string, url: string): Promise<void> => {
  const fullName = fullNameOf(url)
  await prisma.analysisRequest.upsert({
    where: { userId_fullName: { userId, fullName } },
    create: { userId, url, fullName },
    update: { url }
  })
  await prisma.analysisRequest.updateMany({
    where: { userId, fullName, status: { not: 'analyzing' } },
    data: { status: 'queued', error: null }
  })
}

// The job id, for live progress; status is left to the worker
const setJobId = async (userId: string, url: string, jobId: string): Promise<void> => {
  await prisma.analysisRequest.updateMany({ where: { userId, fullName: fullNameOf(url) }, data: { jobId } })
}

// Worker updates; no-ops for system (seed) jobs and requests the user dismissed
const setStatus = async (
  userId: string | undefined,
  url: string,
  status: AnalysisRequestStatus,
  extra: { error?: string | null; repositoryId?: string } = {}
): Promise<void> => {
  if (!userId) return
  await prisma.analysisRequest.updateMany({
    where: { userId, fullName: fullNameOf(url) },
    data: { status, error: extra.error ?? null, ...(extra.repositoryId && { repositoryId: extra.repositoryId }) }
  })
}

/** Your requests that haven't become imports yet, with live progress for running ones */
const listOpen = async (userId: string) => {
  const requests = await prisma.analysisRequest.findMany({
    where: { userId, status: { in: ['queued', 'analyzing', 'failed'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, url: true, fullName: true, status: true, error: true, jobId: true, createdAt: true, updatedAt: true }
  })
  const queue = getQueue(QUEUE_NAMES.REPOSITORY_ANALYSIS)
  return Promise.all(requests.map(async ({ jobId, ...request }) => {
    if (request.status !== 'analyzing' || !jobId) return { ...request, progress: null }
    const job = await queue.getJob(jobId).catch(() => null)
    const progress = job?.progress as { percent?: number; message?: string } | undefined
    return { ...request, progress: progress && typeof progress === 'object' ? progress : null }
  }))
}

const dismiss = async (userId: string, id: string): Promise<boolean> => {
  const { count } = await prisma.analysisRequest.deleteMany({ where: { id, userId, status: { in: ['failed', 'done'] } } })
  return count > 0
}

export const AnalysisRequestService = {
  recordQueued,
  setJobId,
  setStatus,
  listOpen,
  dismiss
}
