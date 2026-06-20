import { AppError } from '../errors'
import { parseGithubRepoUrl } from './parse-github-url'

interface RepoInput {
  url?: unknown
  owner?: unknown
  repo?: unknown
  fullName?: unknown
}

export const resolveRepositoryUrl = (input: RepoInput): string => {
  if (typeof input.url === 'string' && input.url.trim() !== '') {
    parseGithubRepoUrl(input.url.trim())
    return input.url.trim()
  }

  let owner = typeof input.owner === 'string' ? input.owner.trim() : ''
  let repo = typeof input.repo === 'string' ? input.repo.trim() : ''

  if (typeof input.fullName === 'string' && input.fullName.includes('/')) {
    const [parsedOwner, parsedRepo] = input.fullName.split('/')
    if (parsedOwner && parsedRepo) {
      owner = parsedOwner.trim()
      repo = parsedRepo.trim()
    }
  }

  if (owner === '' || repo === '') {
    throw new AppError('Provide url, or owner and repo, or fullName (owner/repo)', 400)
  }

  return `https://github.com/${owner}/${repo}`
}
