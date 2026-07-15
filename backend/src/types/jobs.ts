export interface RepositoryAnalysisJobData {
  url: string
  userId: string
  force?: boolean
}

export interface RepositoryAnalysisJobResult {
  repositoryId: string
  name: string
  url: string
  languageCount: number
  frameworkCount: number
}

export interface ContributorAnalysisJobData {
  userId: string
}

export interface ContributorAnalysisJobResult {
  userId: string
  skillCount: number
  skills: Array<{ name: string; proficiencyScore: number }>
}

export interface QueuedJobResponse {
  /** Always a non-empty string — enqueue throws if BullMQ returns undefined */
  jobId: string
  queue: string
  statusUrl: string
  /** True if a job for the same work was already active/waiting — no new job created */
  alreadyQueued?: boolean
}
