import { getGithubAccessToken, fetchGithub, fetchGithubWithAccept } from '../../lib/github'
import { VALID_REACTIONS, ReactionContent, isValidReaction } from '../../lib/github/utils/constants'

export { isValidReaction }

const REACTIONS_ACCEPT = 'application/vnd.github.squirrel-girl-preview+json'

const listIssues = async (userId: string, owner: string, repo: string, page: number, limit: number) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues?page=${page}&per_page=${limit}&state=all`, { token })
  const issues = await response.json()
  
  let issuesWithSubIssues = issues
  if (Array.isArray(issues)) {
    issuesWithSubIssues = await Promise.all(issues.map(async (issue: any) => {
      try {
        const subRes = await fetchGithub(`/repos/${owner}/${repo}/issues/${issue.number}/sub_issues`, { token })
        if (subRes.ok) {
          issue.sub_issues = await subRes.json()
        } else {
          issue.sub_issues = []
        }
      } catch {
        issue.sub_issues = []
      }
      return issue
    }))
  }

  // Basic pagination header parsing
  const linkHeader = response.headers.get('Link') ?? response.headers.get('link')
  let totalPages = page
  if (linkHeader && linkHeader.includes('rel="last"')) {
    const match = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/)
    if (match) totalPages = parseInt(match[1], 10)
  }
  
  return { issues: issuesWithSubIssues, page, limit, totalPages }
}

const getIssue = async (userId: string, owner: string, repo: string, issueNumber: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithub(`/repos/${owner}/${repo}/issues/${issueNumber}`, { token })
  const issue = await response.json()
  
  if (response.ok && issue) {
    try {
      const subRes = await fetchGithub(`/repos/${owner}/${repo}/issues/${issue.number}/sub_issues`, { token })
      if (subRes.ok) {
        issue.sub_issues = await subRes.json()
      } else {
        issue.sub_issues = []
      }
    } catch {
      issue.sub_issues = []
    }
  }
  
  return issue
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

const listIssueCommentReactions = async (userId: string, owner: string, repo: string, commentId: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  return response.json()
}

const toggleIssueReaction = async (userId: string, owner: string, repo: string, issueNumber: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)

  // Fetch current reactions
  const listRes = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/reactions`, {
    token,
    accept: REACTIONS_ACCEPT
  })
  const reactions: any[] = await listRes.json()

  // Find the authenticated user's existing reaction with the same content
  const meRes = await fetchGithubWithAccept('/user', { token, accept: REACTIONS_ACCEPT })
  const me: any = await meRes.json()
  const existing = reactions.find((r) => r.content === content && r.user?.login === me.login)

  if (existing) {
    // Remove it
    await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/reactions/${existing.id}`, {
      method: 'DELETE',
      token,
      accept: REACTIONS_ACCEPT
    })
    return { toggled: 'removed' as const, reactionId: existing.id }
  }

  // Add it
  const addRes = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  const reaction = await addRes.json()
  return { toggled: 'added' as const, reaction }
}

const toggleIssueCommentReaction = async (userId: string, owner: string, repo: string, commentId: number, content: ReactionContent) => {
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

export const IssuesService = {
  listIssues,
  getIssue,
  listIssueComments,
  createIssue,
  createIssueComment,
  deleteIssueComment,
  listIssueReactions,
  toggleIssueReaction,
  listIssueCommentReactions,
  toggleIssueCommentReaction
}
