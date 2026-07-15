import { AppError } from '../../lib/errors'

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'Open-Source-Contributor-Matching-Platform'

const buildHeaders = (token?: string, accept = 'application/vnd.github.v3+json'): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': USER_AGENT
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const parseGithubError = (status: number, context: string): AppError => {
  if (status === 401) {
    return new AppError('Invalid or expired GitHub token', 401)
  }
  return new AppError(`GitHub API error (${context}): HTTP ${status}`, 502)
}

/**
 * A generalized fetch wrapper for GitHub API.
 */
export const fetchGithub = async (
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<Response> => {
  const { token, headers: customHeaders, ...fetchOptions } = options
  const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`

  const defaultHeaders = buildHeaders(token)
  const headers = { ...defaultHeaders, ...customHeaders } as HeadersInit

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    throw parseGithubError(response.status, path)
  }

  return response
}

export const githubGetJson = async <T>(path: string, token: string): Promise<T> => {
  const response = await fetchGithub(path, { token })
  return response.json() as Promise<T>
}

export const githubGetRaw = async (path: string, token: string): Promise<string> => {
  const response = await fetchGithub(path, {
    token,
    headers: { Accept: 'application/vnd.github.v3.raw' }
  })
  return response.text()
}

export const githubGetResponse = async (path: string, token: string): Promise<Response> => {
  return fetchGithub(path, { token })
}

export const githubTryGetRaw = async (path: string, token: string): Promise<string | null> => {
  try {
    return await githubGetRaw(path, token)
  } catch (err: any) {
    console.error(`[GithubClient] githubTryGetRaw miss for ${path}:`, err?.message || err)
    return null
  }
}

export const githubPathExists = async (path: string, token: string): Promise<boolean> => {
  try {
    await fetchGithub(path, { token, method: 'HEAD' })
    return true
  } catch (err: any) {
    console.error(`[GithubClient] githubPathExists miss for ${path}:`, err?.message || err)
    return false
  }
}

export const githubPostJson = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': USER_AGENT
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new AppError(`GitHub OAuth error: HTTP ${response.status}`, 502)
  }

  return response.json() as Promise<T>
}

export const githubGraphQL = async <T>(
  query: string, 
  token: string, 
  variables: Record<string, unknown> = {},
  accept = 'application/vnd.github.v3+json'
): Promise<T> => {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: buildHeaders(token, accept),
    body: JSON.stringify({ query, variables })
  })
  return response.json() as Promise<T>
}

