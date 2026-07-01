import { getGithubAccessToken, fetchGithub } from '../../lib/github'

const listPulls = async (userId: string, owner: string, repo: string, page: number, limit: number) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/pulls?page=${page}&per_page=${limit}&state=all`, { token })
  const pulls = await response.json()
  
  const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
  let totalPages = page
  if (linkHeader && linkHeader.includes('rel="last"')) {
    const match = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/)
    if (match) totalPages = parseInt(match[1], 10)
  }
  
  return { pulls, page, limit, totalPages }
}

const getPull = async (userId: string, owner: string, repo: string, pullNumber: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithub(`/repos/${owner}/${repo}/pulls/${pullNumber}`, { token })
  return response.json()
}

const listPullComments = async (userId: string, owner: string, repo: string, pullNumber: number, page: number, limit: number) => {
  const token = await getGithubAccessToken(userId)
  
  // Standard issue comments (general discussion on the PR)
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues/${pullNumber}/comments?page=${page}&per_page=${limit}`, { token })
  const comments = await response.json()
  
  const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
  let totalPages = page
  if (linkHeader && linkHeader.includes('rel="last"')) {
    const match = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/)
    if (match) totalPages = parseInt(match[1], 10)
  }
  
  return { comments, page, limit, totalPages }
}

const createPullComment = async (userId: string, owner: string, repo: string, pullNumber: number, body: string) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues/${pullNumber}/comments`, {
    method: 'POST',
    token,
    body: JSON.stringify({ body })
  })
  return response.json()
}

export const PullsService = {
  listPulls,
  getPull,
  listPullComments,
  createPullComment
}
