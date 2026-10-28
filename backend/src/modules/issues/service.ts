import { totalPagesFromLink } from '../../lib/github/utils/pagination'
import { getGithubAccessToken, fetchGithub, fetchGithubWithAccept, githubGraphQL } from '../../lib/github'
import { ReactionContent, isValidReaction } from '../../lib/github/utils/constants'

export { isValidReaction }

const REACTIONS_ACCEPT = 'application/vnd.github.squirrel-girl-preview+json'
// Adds `body_html`: the issue or comment exactly as GitHub renders it
const FULL_ACCEPT = 'application/vnd.github.full+json'

const GRAPHQL_REACTIONS: Record<string, ReactionContent> = {
  THUMBS_UP: '+1',
  THUMBS_DOWN: '-1',
  LAUGH: 'laugh',
  HOORAY: 'hooray',
  CONFUSED: 'confused',
  HEART: 'heart',
  ROCKET: 'rocket',
  EYES: 'eyes'
}

type ReactionGroupsResponse = {
  data?: { nodes: ({ reactionGroups?: { content: string; viewerHasReacted: boolean }[] } | null)[] }
}

// REST payloads carry reaction counts but not which ones the caller left. One
// GraphQL call fills that in as `viewer_reactions` on the issue or each comment.
const withViewerReactions = async <T extends { node_id?: string }>(items: T[], token: string) => {
  const ids = items.map((item) => item.node_id ?? '').slice(0, 100)
  let viewer: ReactionContent[][] = []
  if (ids.some(Boolean)) {
    try {
      const res = await githubGraphQL<ReactionGroupsResponse>(
        'query($ids: [ID!]!) { nodes(ids: $ids) { ... on Reactable { reactionGroups { content viewerHasReacted } } } }',
        token,
        { ids: ids.filter(Boolean) }
      )
      // nodes come back in the order of the ids asked for
      const nodes = res.data?.nodes ?? []
      let next = 0
      viewer = ids.map((id) => {
        if (!id) return []
        const groups = nodes[next++]?.reactionGroups ?? []
        return groups.filter((g) => g.viewerHasReacted).map((g) => GRAPHQL_REACTIONS[g.content]).filter(Boolean)
      })
    } catch {
      // Counts still show; the caller's own reactions just aren't highlighted
    }
  }
  return items.map((item, i) => ({ ...item, viewer_reactions: viewer[i] ?? [] }))
}

// POST answers 201 when it adds the reaction and 200 when the caller already
// had it; then that reaction is deleted, which makes this a toggle.
const toggleReaction = async (token: string, subjectPath: string, content: ReactionContent) => {
  const addRes = await fetchGithubWithAccept(`${subjectPath}/reactions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content }),
    accept: REACTIONS_ACCEPT
  })
  const reaction = await addRes.json()
  if (addRes.status === 201) return { toggled: 'added' as const, reaction }

  await fetchGithubWithAccept(`${subjectPath}/reactions/${reaction.id}`, {
    method: 'DELETE',
    token,
    accept: REACTIONS_ACCEPT
  })
  return { toggled: 'removed' as const, reactionId: reaction.id }
}

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

  const totalPages = totalPagesFromLink(response.headers.get('Link') ?? response.headers.get('link'), page)
  
  return { issues: issuesWithSubIssues, page, limit, totalPages }
}

const getIssue = async (userId: string, owner: string, repo: string, issueNumber: number) => {
  const token = await getGithubAccessToken(userId)
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}`, { token, accept: FULL_ACCEPT })
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
  
  const [withReactions] = await withViewerReactions([issue], token)
  return withReactions
}

const listIssueComments = async (userId: string, owner: string, repo: string, issueNumber: number, page: number, limit: number) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?page=${page}&per_page=${limit}`, {
    token,
    accept: FULL_ACCEPT
  })
  const comments = await withViewerReactions(await response.json(), token)
  
  const totalPages = totalPagesFromLink(response.headers.get('Link') ?? response.headers.get('link'), page)
  
  return { comments, page, limit, totalPages }
}

const createIssue = async (userId: string, owner: string, repo: string, title: string, body: string) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    token,
    body: JSON.stringify({ title, body }),
    accept: FULL_ACCEPT
  })
  return response.json()
}

const createIssueComment = async (userId: string, owner: string, repo: string, issueNumber: number, body: string) => {
  const token = await getGithubAccessToken(userId)
  
  const response = await fetchGithubWithAccept(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    token,
    body: JSON.stringify({ body }),
    accept: FULL_ACCEPT
  })
  return { ...(await response.json()), viewer_reactions: [] }
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
  return toggleReaction(token, `/repos/${owner}/${repo}/issues/${issueNumber}`, content)
}

const toggleIssueCommentReaction = async (userId: string, owner: string, repo: string, commentId: number, content: ReactionContent) => {
  const token = await getGithubAccessToken(userId)
  return toggleReaction(token, `/repos/${owner}/${repo}/issues/comments/${commentId}`, content)
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
