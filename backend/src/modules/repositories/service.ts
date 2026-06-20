import { getGithubAccessToken } from '../../lib/github/get-access-token'
import { githubGetResponse } from '../../lib/github/client'
import { AppError } from '../../lib/errors'

interface GithubRepoSummary {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  private: boolean
}

interface PaginatedGithubRepos {
  repos: GithubRepoSummary[]
  page: number
  limit: number
  total: number
  totalPages: number
}

const parseGithubLinkPagination = (
  linkHeader: string | null,
  page: number,
  limit: number,
  currentCount: number
): { total: number; totalPages: number } => {
  if (linkHeader === null) {
    return { total: currentCount, totalPages: 1 }
  }

  const links = linkHeader.split(',')
  const lastLink = links.find((link) => link.includes('rel="last"'))

  if (lastLink !== undefined) {
    const urlMatch = lastLink.match(/<([^>]+)>/)
    if (urlMatch !== null) {
      try {
        const lastPage = parseInt(new URL(urlMatch[1]).searchParams.get('page') ?? '1', 10)
        return { total: lastPage * limit, totalPages: lastPage }
      } catch {
        // fall through
      }
    }
  }

  const prevLink = links.find((link) => link.includes('rel="prev"'))
  if (prevLink !== undefined) {
    const urlMatch = prevLink.match(/<([^>]+)>/)
    if (urlMatch !== null) {
      try {
        const prevPage = parseInt(new URL(urlMatch[1]).searchParams.get('page') ?? '0', 10)
        return { total: prevPage * limit + currentCount, totalPages: prevPage + 1 }
      } catch {
        // fall through
      }
    }
  }

  return { total: currentCount, totalPages: 1 }
}

const listGithubRepositories = async (
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedGithubRepos> => {
  const token = await getGithubAccessToken(userId)
  const response = await githubGetResponse(
    `/user/repos?sort=updated&page=${page}&per_page=${limit}`,
    token
  )

  const repos = await response.json() as GithubRepoSummary[]
  if (!Array.isArray(repos)) {
    throw new AppError('Unexpected GitHub response while listing repositories', 502)
  }

  const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
  const pagination = parseGithubLinkPagination(linkHeader, page, limit, repos.length)

  return {
    repos,
    page,
    limit,
    total: pagination.total,
    totalPages: pagination.totalPages
  }
}

export const RepositoryService = {
  listGithubRepositories
}

export type { PaginatedGithubRepos, GithubRepoSummary }
