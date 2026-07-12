import { getGithubAccessToken, fetchGithub, fetchGithubWithAccept } from '../../lib/github'

const REACTIONS_ACCEPT = 'application/vnd.github.squirrel-girl-preview+json'

const VALID_REACTIONS = ['+1', '-1', 'laugh', 'hooray', 'confused', 'heart', 'rocket', 'eyes'] as const
type ReactionContent = typeof VALID_REACTIONS[number]

export const isValidReaction = (content: string): content is ReactionContent =>
  (VALID_REACTIONS as readonly string[]).includes(content)

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

// ─── Reactions ───────────────────────────────────────────────────────────────
// PRs use the same GitHub Issues reactions API (referenced by issue number)

const listPullReactions = async (userId: string, owner: string, repo: string, pullNumber: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${pullNumber}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const addPullReaction = async (userId: string, owner: string, repo: string, pullNumber: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${pullNumber}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const deletePullReaction = async (userId: string, owner: string, repo: string, pullNumber: number, reactionId: number) => {
  const token = await getGithubAccessToken(userId)
  await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${pullNumber}/reactions/${reactionId}`, {
    method: 'DELETE',
    token,
    accept: REACTIONS_ACCEPT
  })
  return { success: true }
}

const listPullCommentReactions = async (userId: string, owner: string, repo: string, commentId: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const addPullCommentReaction = async (userId: string, owner: string, repo: string, commentId: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const deletePullCommentReaction = async (userId: string, owner: string, repo: string, commentId: number, reactionId: number) => {
  const token = await getGithubAccessToken(userId)
  await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions/${reactionId}`, {
    method: 'DELETE',
    token,
    accept: REACTIONS_ACCEPT
  })
  return { success: true }
}

export const PullsService = {
  listPulls,
  getPull,
  listPullComments,
  createPullComment,
  listPullReactions,
  addPullReaction,
  deletePullReaction,
  listPullCommentReactions,
  addPullCommentReaction,
  deletePullCommentReaction
}
