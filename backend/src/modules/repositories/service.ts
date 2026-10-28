import { getGithubAccessToken, githubGetResponse, githubGraphQL, parseGithubRepoUrl, GOOD_FIRST_ISSUE_LABELS } from '../../lib/github'
import { config } from '../../config'
import { redisClient } from '../../utils/redis-client'
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

// GitHub's search API returns at most 1,000 results per query
const GITHUB_SEARCH_MAX_RESULTS = 1000

// Search all public repositories on GitHub (best match first). Accepts GitHub
// search qualifiers such as `language:rust` or `topic:cli`. A pasted GitHub URL
// is reduced to `owner/name`. Public data, so the server token is a fallback
// when the user's token is missing or rejected.
const SEARCH_CACHE_SECONDS = 10 * 60

const searchGithubRepositories = async (
  userId: string,
  search: string,
  page: number,
  limit: number,
  goodFirstOnly = false
): Promise<PaginatedGithubRepos> => {
  const query = search
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$|\/$/g, '')
  // Pages past the 1,000-result cap are rejected by GitHub (422)
  if (query === '' || (page - 1) * limit >= GITHUB_SEARCH_MAX_RESULTS) {
    return { repos: [], page, limit, total: 0, totalPages: 0 }
  }

  // Archived repos can't take contributions; skip them unless the user asked about archived ones
  const qualifiers = [
    /\barchived:/i.test(query) ? '' : 'archived:false',
    goodFirstOnly ? 'good-first-issues:>0' : ''
  ].filter(Boolean)
  const fullQuery = [query, ...qualifiers].join(' ')

  const cacheKey = `gh-search:${fullQuery}:${page}:${limit}`
  try {
    const cached = await redisClient.get(cacheKey)
    if (cached) return JSON.parse(cached) as PaginatedGithubRepos
  } catch {
    // cache is best-effort
  }

  const path = `/search/repositories?q=${encodeURIComponent(fullQuery)}&page=${page}&per_page=${limit}`
  let response: Response
  try {
    response = await githubGetResponse(path, await getGithubAccessToken(userId))
  } catch (err) {
    if (!config.githubServerToken) throw err
    response = await githubGetResponse(path, config.githubServerToken)
  }

  const data = await response.json() as { total_count?: number; items?: GithubRepoSummary[] }
  const repos = Array.isArray(data.items) ? data.items : []
  const total = data.total_count ?? repos.length
  const reachable = Math.min(total, GITHUB_SEARCH_MAX_RESULTS)

  const result = { repos, page, limit, total, totalPages: Math.ceil(reachable / limit) }
  try {
    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', SEARCH_CACHE_SECONDS)
  } catch {
    // cache is best-effort
  }
  return result
}

type StarterIssue = {
  number: number
  title: string
  url: string
  createdAt: string
  comments: number
  assigned: boolean
  labels: { name: string; color: string }[]
}

type StarterIssuesResponse = {
  data?: {
    repository?: {
      issues?: {
        nodes?: Array<{
          number: number
          title: string
          url: string
          createdAt: string
          comments: { totalCount: number }
          assignees: { totalCount: number }
          labels: { nodes: { name: string; color: string }[] }
        }>
      }
    } | null
  }
}

const STARTER_ISSUES_LIMIT = 10
const STARTER_ISSUES_CACHE_SECONDS = 15 * 60

const STARTER_ISSUES_QUERY = `
  query starterIssues($owner: String!, $repo: String!, $labels: [String!]) {
    repository(owner: $owner, name: $repo) {
      issues(states: OPEN, labels: $labels, first: 30, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          number
          title
          url
          createdAt
          comments { totalCount }
          assignees { totalCount }
          labels(first: 6) { nodes { name color } }
        }
      }
    }
  }
`

// Open good-first issues for a tracked repository, recently active and
// unassigned ones first.
// These are public reads, so when the user's GitHub token is missing or
// rejected we fall back to the server token rather than show nothing.
const listStarterIssues = async (userId: string, owner: string, repo: string): Promise<StarterIssue[]> => {
  const cacheKey = `starter-issues:${owner.toLowerCase()}/${repo.toLowerCase()}`
  try {
    const cached = await redisClient.get(cacheKey)
    if (cached) return JSON.parse(cached) as StarterIssue[]
  } catch {
    // cache is best-effort
  }

  const run = (token: string) =>
    githubGraphQL<StarterIssuesResponse>(STARTER_ISSUES_QUERY, token, { owner, repo, labels: GOOD_FIRST_ISSUE_LABELS })

  let response: StarterIssuesResponse
  try {
    response = await run(await getGithubAccessToken(userId))
  } catch (err) {
    if (!config.githubServerToken) throw err
    response = await run(config.githubServerToken)
  }

  const issues = (response.data?.repository?.issues?.nodes ?? [])
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      createdAt: issue.createdAt,
      comments: issue.comments.totalCount,
      assigned: issue.assignees.totalCount > 0,
      labels: issue.labels.nodes
    }))
    // Unassigned first: those are the ones a newcomer can actually pick up
    .sort((a, b) => Number(a.assigned) - Number(b.assigned))
    .slice(0, STARTER_ISSUES_LIMIT)

  try {
    await redisClient.set(cacheKey, JSON.stringify(issues), 'EX', STARTER_ISSUES_CACHE_SECONDS)
  } catch {
    // cache is best-effort
  }
  return issues
}

export const RepositoryService = {
  searchGithubRepositories,
  listGithubRepositories,
  searchEasyContributionRepos,
  listStarterIssues
}

export type { PaginatedGithubRepos, GithubRepoSummary, StarterIssue }
