import { AppError } from '../errors'

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'Open-Source-Contributor-Matching-Platform'

const buildHeaders = (token: string, accept = 'application/vnd.github.v3+json'): Record<string, string> => ({
  Accept: accept,
  'User-Agent': USER_AGENT,
  Authorization: `Bearer ${token}`
})

const GITHUB_TIMEOUT_MS = 15_000

// Every GitHub call gets a timeout so a hung connection can't stall a request or a job.
const fetch = (input: string, init: RequestInit = {}): Promise<Response> =>
  globalThis.fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(GITHUB_TIMEOUT_MS) })

const parseGithubError = (status: number, context: string): AppError => {
  // A GitHub 401 means the stored GitHub token is bad, not our session; surfacing
  // it as 401 would make the frontend log the user out.
  if (status === 401) {
    return new AppError('GitHub token is invalid or expired. Please sign in with GitHub again.', 403)
  }
  if (status === 403 || status === 404 || status === 422) {
    return new AppError(`GitHub API error (${context}): HTTP ${status}`, status)
  }
  if (status === 429) {
    return new AppError('GitHub rate limit exceeded. Try again later.', 429)
  }
  return new AppError(`GitHub API error (${context}): HTTP ${status}`, 502)
}

// Tokens issued before OSCA asked for public_repo can read but not write. GitHub
// answers those writes with 403/404, and X-OAuth-Scopes shows the token is why.
const lacksWriteScope = (response: Response): boolean => {
  const scopes = response.headers.get('x-oauth-scopes')
  if (scopes === null) return false
  return !scopes.split(',').some((s) => ['repo', 'public_repo'].includes(s.trim()))
}

const parseWriteError = (response: Response, method: string, context: string): AppError => {
  if (method !== 'GET' && (response.status === 403 || response.status === 404) && lacksWriteScope(response)) {
    return new AppError('GitHub token is missing permission to post on GitHub. Please sign in with GitHub again.', 403)
  }
  return parseGithubError(response.status, context)
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
    throw parseWriteError(response, method, path)
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
    throw parseWriteError(response, method, path)
  }

  return response
}
