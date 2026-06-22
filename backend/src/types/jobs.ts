export interface RepositoryAnalysisJobData {
  url: string
  userId: string
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
  jobId: string | undefined
  queue: string
  statusUrl: string
}
