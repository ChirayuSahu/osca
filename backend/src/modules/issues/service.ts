import { getGithubAccessToken, fetchGithub } from '../../lib/github'

const listIssues = async (userId: string, owner: string, repo: string, page: number, limit: number) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues?page=${page}&per_page=${limit}&state=all`, { token })
  const issues = await response.json()
  
  // Basic pagination header parsing
  const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
  let totalPages = page
  if (linkHeader && linkHeader.includes('rel="last"')) {
    const match = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/)
    if (match) totalPages = parseInt(match[1], 10)
  }
  
  return { issues, page, limit, totalPages }
}

const getIssue = async (userId: string, owner: string, repo: string, issueNumber: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues/${issueNumber}`, { token })
  return response.json()
}

const listIssueComments = async (userId: string, owner: string, repo: string, issueNumber: number, page: number, limit: number) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?page=${page}&per_page=${limit}`, { token })
  const comments = await response.json()
  
  const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
  let totalPages = page
  if (linkHeader && linkHeader.includes('rel="last"')) {
    const match = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/)
    if (match) totalPages = parseInt(match[1], 10)
  }
  
  return { comments, page, limit, totalPages }
}

const createIssue = async (userId: string, owner: string, repo: string, title: string, body: string) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    token,
    body: JSON.stringify({ title, body })
  })
  return response.json()
}

const createIssueComment = async (userId: string, owner: string, repo: string, issueNumber: number, body: string) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    token,
    body: JSON.stringify({ body })
  })
  return response.json()
}

export const IssuesService = {
  listIssues,
  getIssue,
  listIssueComments,
  createIssue,
  createIssueComment
}
