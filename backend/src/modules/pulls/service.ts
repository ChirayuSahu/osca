import { getGithubAccessToken, fetchGithub, fetchGithubWithAccept } from '../../lib/github'
import { VALID_REACTIONS, ReactionContent, isValidReaction } from '../../lib/github/utils/constants'

export { isValidReaction }

const REACTIONS_ACCEPT = 'application/vnd.github.squirrel-girl-preview+json'

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

const listPullCommentReactions = async (userId: string, owner: string, repo: string, commentId: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const togglePullReaction = async (userId: string, owner: string, repo: string, pullNumber: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)

  const listRes = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${pullNumber}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  const reactions: any[] = await listRes.json()

  const meRes = await fetchGithubWithAccept('/user', { token, accept: REACTIONS_ACCEPT })
  const me: any = await meRes.json()
  const existing = reactions.find((r) => r.content === content && r.user?.login === me.login)

  if (existing) {
    await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${pullNumber}/reactions/${existing.id}`, {
      method: 'DELETE',
      token,
      accept: REACTIONS_ACCEPT
    })
    return { toggled: 'removed' as const, reactionId: existing.id }
  }

  const addRes = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${pullNumber}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  const reaction = await addRes.json()
  return { toggled: 'added' as const, reaction }
}

const togglePullCommentReaction = async (userId: string, owner: string, repo: string, commentId: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)

  const listRes = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  const reactions: any[] = await listRes.json()

  const meRes = await fetchGithubWithAccept('/user', { token, accept: REACTIONS_ACCEPT })
  const me: any = await meRes.json()
  const existing = reactions.find((r) => r.content === content && r.user?.login === me.login)

  if (existing) {
    await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions/${existing.id}`, {
      method: 'DELETE',
      token,
      accept: REACTIONS_ACCEPT
    })
    return { toggled: 'removed' as const, reactionId: existing.id }
  }

  const addRes = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  const reaction = await addRes.json()
  return { toggled: 'added' as const, reaction }
}

export const PullsService = {
  listPulls,
  getPull,
  listPullComments,
  createPullComment,
  listPullReactions,
  togglePullReaction,
  listPullCommentReactions,
  togglePullCommentReaction
}
