import { totalPagesFromLink } from '../../lib/github/utils/pagination'
import { getGithubAccessToken, fetchGithub, fetchGithubWithAccept } from '../../lib/github'
import { VALID_REACTIONS, ReactionContent, isValidReaction } from '../../lib/github/utils/constants'
import { IssuesService } from '../issues/service'

export { isValidReaction }

const REACTIONS_ACCEPT = 'application/vnd.github.squirrel-girl-preview+json'

const listPulls = async (userId: string, owner: string, repo: string, page: number, limit: number) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/pulls?page=${page}&per_page=${limit}&state=all`, { token })
  const pulls = await response.json()
  
  const totalPages = totalPagesFromLink(response.headers.get('Link') ?? response.headers.get('link'), page)
  
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
  
  const totalPages = totalPagesFromLink(response.headers.get('Link') ?? response.headers.get('link'), page)
  
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

// Toggling uses the issues approach (POST, then delete if it already existed),
// so it works however many reactions the PR or comment has
const togglePullReaction = (userId: string, owner: string, repo: string, pullNumber: number, content: ReactionContent) =>
  IssuesService.toggleIssueReaction(userId, owner, repo, pullNumber, content)

const togglePullCommentReaction = (userId: string, owner: string, repo: string, commentId: number, content: ReactionContent) =>
  IssuesService.toggleIssueCommentReaction(userId, owner, repo, commentId, content)

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
