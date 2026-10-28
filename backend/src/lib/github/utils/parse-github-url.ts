import { AppError } from '../../errors'

export interface ParsedGithubRepo {
  owner: string
  repo: string
}

// GitHub's own name rules. These names go into GitHub API paths with a user's
// token, so anything else (e.g. "..") could reach a different endpoint.
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

export const isValidRepoRef = (owner: string, repo: string): boolean =>
  OWNER_PATTERN.test(owner) && REPO_PATTERN.test(repo) && repo !== '.' && repo !== '..'

export const assertValidRepoRef = (owner: string, repo: string): void => {
  if (!isValidRepoRef(owner, repo)) {
    throw new AppError('Invalid repository name', 400)
  }
}

// Only [https://][www.]github.com/<owner>/<repo>[.git][/...]
const GITHUB_REPO_URL = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?(?:[/?#].*)?$/i

export const parseGithubRepoUrl = (url: string): ParsedGithubRepo => {
  const match = url.trim().match(GITHUB_REPO_URL)
  if (!match) {
    throw new AppError('Invalid repository URL. Only GitHub URLs are supported.', 400)
  }
  const [, owner, repo] = match
  assertValidRepoRef(owner, repo)
  return { owner, repo }
}
