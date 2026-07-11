import { getGithubAccessToken, fetchGithub, fetchGithubWithAccept } from '../../lib/github'

const REACTIONS_ACCEPT = 'application/vnd.github.squirrel-girl-preview+json'

const VALID_REACTIONS = ['+1', '-1', 'laugh', 'hooray', 'confused', 'heart', 'rocket', 'eyes'] as const
type ReactionContent = typeof VALID_REACTIONS[number]

export const isValidReaction = (content: string): content is ReactionContent =>
  (VALID_REACTIONS as readonly string[]).includes(content)

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

const deleteIssueComment = async (userId: string, owner: string, repo: string, commentId: number) => {
  const token = await getGithubAccessToken(userId)
  
  await fetchGithub(`/repos/${owner}/${repo}/issues/comments/${commentId}`, {
    method: 'DELETE',
    token
  })
  return { success: true }
}

// ─── Reactions ───────────────────────────────────────────────────────────────

const listIssueReactions = async (userId: string, owner: string, repo: string, issueNumber: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const addIssueReaction = async (userId: string, owner: string, repo: string, issueNumber: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const deleteIssueReaction = async (userId: string, owner: string, repo: string, issueNumber: number, reactionId: number) => {
  const token = await getGithubAccessToken(userId)
  await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/reactions/${reactionId}`, {
    method: 'DELETE',
    token,
    accept: REACTIONS_ACCEPT
  })
  return { success: true }
}

const listIssueCommentReactions = async (userId: string, owner: string, repo: string, commentId: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const addIssueCommentReaction = async (userId: string, owner: string, repo: string, commentId: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const deleteIssueCommentReaction = async (userId: string, owner: string, repo: string, commentId: number, reactionId: number) => {
  const token = await getGithubAccessToken(userId)
  await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions/${reactionId}`, {
    method: 'DELETE',
    token,
    accept: REACTIONS_ACCEPT
  })
  return { success: true }
}

export const IssuesService = {
  listIssues,
  getIssue,
  listIssueComments,
  createIssue,
  createIssueComment,
  deleteIssueComment,
  listIssueReactions,
  addIssueReaction,
  deleteIssueReaction,
  listIssueCommentReactions,
  addIssueCommentReaction,
  deleteIssueCommentReaction
}
