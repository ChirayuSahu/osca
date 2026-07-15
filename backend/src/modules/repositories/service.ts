import { getGithubAccessToken, githubGetResponse, parseGithubRepoUrl } from '../../lib/github'
import { AppError } from '../../lib/errors'
import { prisma } from '../../utils/prisma'

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
  owner: {
    login: string
    type: string
  }
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
      } catch (err) {
        console.error('[RepositoryService] Failed to parse "last" Link header page:', err)
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
      } catch (err) {
        console.error('[RepositoryService] Failed to parse "prev" Link header page:', err)
      }
    }
  }

  return { total: currentCount, totalPages: 1 }
}

const listGithubRepositories = async (
  userId: string,
  page: number,
  limit: number,
  affiliation: string = 'owner,collaborator,organization_member',
  search?: string
): Promise<PaginatedGithubRepos> => {
  const token = await getGithubAccessToken(userId)

  if (search !== undefined && search.trim() !== '') {
    const response = await githubGetResponse(
      `/user/repos?sort=updated&per_page=100&affiliation=${affiliation}&visibility=public`,
      token
    )

    let repos = await response.json() as GithubRepoSummary[]
    if (!Array.isArray(repos)) {
      throw new AppError('Unexpected GitHub response while listing repositories', 502)
    }

    const query = search.toLowerCase().trim()
    repos = repos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        (repo.description !== null && repo.description.toLowerCase().includes(query)) ||
        repo.full_name.toLowerCase().includes(query)
    )

    const total = repos.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedRepos = repos.slice(startIndex, startIndex + limit)

    return {
      repos: paginatedRepos,
      page,
      limit,
      total,
      totalPages
    }
  }

  const response = await githubGetResponse(
    `/user/repos?sort=updated&page=${page}&per_page=${limit}&affiliation=${affiliation}&visibility=public`,
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

const searchEasyContributionRepos = async (
  userId: string,
  page: number,
  limit: number,
  language?: string
): Promise<PaginatedGithubRepos> => {
  const token = await getGithubAccessToken(userId)
  
  let query = 'good-first-issues:>0 state:open'
  if (language && language.trim() !== '') {
    query += ` language:${language.trim()}`
  }

  // GitHub Search API requires URL encoding for the query
  const encodedQuery = encodeURIComponent(query)
  const response = await githubGetResponse(
    `/search/repositories?q=${encodedQuery}&sort=updated&order=desc&page=${page}&per_page=${limit}`,
    token
  )

  const data = await response.json()
  const repos = data.items as GithubRepoSummary[] || []
  
  const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
  const pagination = parseGithubLinkPagination(linkHeader, page, limit, repos.length)

  // Wait, GitHub search API also returns `total_count`. We can use it.
  const total = data.total_count ?? pagination.total
  const totalPages = Math.ceil(total / limit)

  return {
    repos,
    page,
    limit,
    total,
    totalPages
  }
}

export const RepositoryService = {
  listGithubRepositories,
  searchEasyContributionRepos
}

export type { PaginatedGithubRepos, GithubRepoSummary }
