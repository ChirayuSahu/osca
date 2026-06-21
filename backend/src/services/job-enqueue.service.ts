import { getQueue, QUEUE_NAMES, type QueueName } from '../config/queue'
import type {
  ContributorAnalysisJobData,
  QueuedJobResponse,
  RepositoryAnalysisJobData
} from '../types/jobs'

const buildStatusUrl = (queue: QueueName, jobId: string | undefined): string =>
  `/api/v1/jobs/${queue}/${jobId ?? ''}`

const enqueue = async (
  queueName: QueueName,
  jobName: string,
  data: RepositoryAnalysisJobData | ContributorAnalysisJobData
): Promise<QueuedJobResponse> => {
  const queue = getQueue(queueName)
  const job = await queue.add(jobName, data)

  return {
    jobId: job.id,
    queue: queueName,
    statusUrl: buildStatusUrl(queueName, job.id)
  }
}

export const JobEnqueueService = {
  enqueueRepositoryAnalysis: (url: string, userId: string) =>
    enqueue(QUEUE_NAMES.REPOSITORY_ANALYSIS, 'analyze-repository', { url, userId }),

  enqueueContributorAnalysis: (userId: string) =>
    enqueue(QUEUE_NAMES.CONTRIBUTOR_ANALYSIS, 'analyze-contributor', { userId })
}
