import { AppError } from '../errors'

export interface ParsedGithubRepo {
  owner: string
  repo: string
}

export const parseGithubRepoUrl = (url: string): ParsedGithubRepo => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/)
  if (!match) {
    throw new AppError('Invalid repository URL. Only GitHub URLs are supported.', 400)
  }

  return { owner: match[1], repo: match[2] }
}
