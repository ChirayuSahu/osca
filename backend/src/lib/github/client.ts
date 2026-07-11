import { AppError } from '../errors'

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'Open-Source-Contributor-Matching-Platform'

const buildHeaders = (token: string, accept = 'application/vnd.github.v3+json'): Record<string, string> => ({
  Accept: accept,
  'User-Agent': USER_AGENT,
  Authorization: `Bearer ${token}`
})

const parseGithubError = (status: number, context: string): AppError => {
  if (status === 401) {
    return new AppError('Invalid or expired GitHub token', 401)
  }
  return new AppError(`GitHub API error (${context}): HTTP ${status}`, 502)
}

export const githubGetJson = async <T>(path: string, token: string): Promise<T> => {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: buildHeaders(token)
  })

  if (!response.ok) {
    throw parseGithubError(response.status, path)
  }

  return response.json() as Promise<T>
}

export const githubGetRaw = async (path: string, token: string): Promise<string> => {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: buildHeaders(token, 'application/vnd.github.v3.raw')
  })

  if (!response.ok) {
    throw parseGithubError(response.status, path)
  }

  return response.text()
}

export const githubGetResponse = async (path: string, token: string): Promise<Response> => {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: buildHeaders(token)
  })

  if (!response.ok) {
    throw parseGithubError(response.status, path)
  }

  return response
}

export const githubTryGetRaw = async (path: string, token: string): Promise<string | null> => {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: buildHeaders(token, 'application/vnd.github.v3.raw')
  })

  if (!response.ok) {
    return null
  }

  return response.text()
}

export const githubPathExists = async (path: string, token: string): Promise<boolean> => {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: buildHeaders(token)
  })

  return response.ok
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

  if (!response.ok) {
    throw parseGithubError(response.status, 'graphql')
  }

  return response.json() as Promise<T>
}

export const fetchGithub = async (
  path: string,
  options: { token: string; method?: string; body?: string | object }
): Promise<Response> => {
  const { token, method = 'GET', body } = options
  const headers = buildHeaders(token)

  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers,
    body: typeof body === 'object' ? JSON.stringify(body) : body
  })

  if (!response.ok) {
    throw parseGithubError(response.status, path)
  }

  return response
}

/**
 * Like fetchGithub but with a custom Accept header — used for GitHub preview APIs
 * such as the Reactions API (squirrel-girl-preview).
 */
export const fetchGithubWithAccept = async (
  path: string,
  options: { token: string; method?: string; body?: string | object; accept: string }
): Promise<Response> => {
  const { token, method = 'GET', body, accept } = options
  const headers = buildHeaders(token, accept)

  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers,
    body: typeof body === 'object' ? JSON.stringify(body) : body
  })

  if (!response.ok) {
    throw parseGithubError(response.status, path)
  }

  return response
}
