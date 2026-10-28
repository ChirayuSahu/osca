import { config } from '../config'
import { githubGraphQL, getGithubAccessToken } from '../lib/github'
import { GOOD_FIRST_ISSUE_LABELS } from '../lib/github/utils/constants'
import { redisClient } from '../utils/redis-client'
import { generateFeed } from './recommendation-engine.service'
import type { Reason } from './recommendation-reasons'

// "Your next issue": open starter issues nobody has claimed, from the repos the
// feed ranks highest for this user. One GraphQL call covers every repo.

const REPOS_CONSIDERED = 15
const ISSUES_PER_REPO = 8
const MAX_PER_REPO = 3
const CACHE_SECONDS = 15 * 60
const DAY_MS = 24 * 60 * 60 * 1000

type IssueNode = {
  number: number
  title: string
  url: string
  createdAt: string
  comments: { totalCount: number }
  assignees: { totalCount: number }
  closedByPullRequestsReferences: { totalCount: number }
  labels: { nodes: Array<{ name: string; color: string }> }
}

export type IssueRecommendation = {
  number: number
  title: string
  url: string
  createdAt: string
  comments: number
  labels: Array<{ name: string; color: string }>
  repository: { id: string; owner: string; name: string; primaryLanguage: string | null }
  reasons: Reason[]
  score: number
}

const cacheKey = (userId: string) => `recs:issues:${userId}`

const ago = (iso: string): string => {
  const days = Math.floor((Date.now() - Date.parse(iso)) / DAY_MS)
  if (days <= 0) return 'Opened today'
  if (days === 1) return 'Opened yesterday'
  if (days < 30) return `Opened ${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? 'Opened a month ago' : `Opened ${months} months ago`
}

// Fresh issues are still open for the taking; very old ones often went stale
const freshness = (createdAt: string): number => {
  const days = (Date.now() - Date.parse(createdAt)) / DAY_MS
  if (days <= 14) return 1
  if (days >= 180) return 0
  return 1 - (days - 14) / 166
}

// Some discussion means a maintainer scoped it; a long thread is a warning sign
const discussion = (comments: number): number => (comments === 0 ? 0.6 : comments <= 5 ? 1 : comments <= 10 ? 0.6 : 0.3)

const compute = async (userId: string): Promise<IssueRecommendation[]> => {
  const { feed } = await generateFeed(userId, 1, REPOS_CONSIDERED, {}, null)
  if (feed.length === 0) return []

  // The user's own token where possible (their rate limit), else the server's
  const token = await getGithubAccessToken(userId).catch(() => config.githubServerToken)
  if (!token) return []

  const fields = feed.map(({ repository }, i) => `
    r${i}: repository(owner: ${JSON.stringify(repository.owner)}, name: ${JSON.stringify(repository.name)}) {
      issues(first: ${ISSUES_PER_REPO}, states: OPEN, labels: $labels, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          number title url createdAt
          comments { totalCount }
          assignees { totalCount }
          closedByPullRequestsReferences(first: 1, includeClosedPrs: false) { totalCount }
          labels(first: 6) { nodes { name color } }
        }
      }
    }`).join('\n')
  const res = await githubGraphQL<{ data?: Record<string, { issues?: { nodes?: IssueNode[] } } | null> }>(
    `query($labels: [String!]) { ${fields} }`,
    token,
    { labels: GOOD_FIRST_ISSUE_LABELS }
  )

  const perRepo: IssueRecommendation[][] = []
  feed.forEach(({ repository, scoreInfo }, i) => {
    const repoMatch = 1 - i / feed.length
    const responsive = repository.maintainerResponseHours !== null && repository.maintainerResponseHours <= 48
    const repoReason = scoreInfo.reasons?.find(r => r.kind !== 'starters' && r.kind !== 'explore')
    const issues = (res.data?.[`r${i}`]?.issues?.nodes ?? [])
      // Still free: nobody assigned and no PR that would close it
      .filter(issue => issue.assignees.totalCount === 0 && issue.closedByPullRequestsReferences.totalCount === 0)
      .map(issue => ({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        createdAt: issue.createdAt,
        comments: issue.comments.totalCount,
        labels: issue.labels.nodes,
        repository: { id: repository.id, owner: repository.owner, name: repository.name, primaryLanguage: repository.primaryLanguage },
        score: 0.5 * repoMatch + 0.25 * freshness(issue.createdAt) + 0.15 * discussion(issue.comments.totalCount) + (responsive ? 0.1 : 0),
        reasons: [
          { kind: 'starters' as const, text: 'Unassigned, no PR yet' },
          { kind: 'active' as const, text: ago(issue.createdAt) },
          ...(responsive ? [{ kind: 'responsive' as const, text: 'Maintainers reply quickly' }] : repoReason ? [repoReason] : [])
        ]
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PER_REPO)
    if (issues.length > 0) perRepo.push(issues)
  })
  // Round by round (each repo's best, then each repo's second best, ...), best
  // first within a round, so the list mixes projects instead of one repo's three
  const picks: IssueRecommendation[] = []
  for (let round = 0; round < MAX_PER_REPO; round++) {
    picks.push(...perRepo.flatMap(list => (list[round] ? [list[round]] : [])).sort((a, b) => b.score - a.score))
  }
  return picks
}

/** Starter issues for this user, best first; cached for 15 minutes */
export const getIssueRecommendations = async (userId: string, limit = 30): Promise<IssueRecommendation[]> => {
  const cached = await redisClient.get(cacheKey(userId)).catch(() => null)
  const issues: IssueRecommendation[] = cached ? JSON.parse(cached) : await compute(userId)
  if (!cached) await redisClient.set(cacheKey(userId), JSON.stringify(issues), 'EX', CACHE_SECONDS).catch(() => {})
  return issues.slice(0, limit)
}

// Settings that change the ranking make the cached list stale
export const clearIssueRecommendations = async (userId: string): Promise<void> => {
  await redisClient.del(cacheKey(userId)).catch(() => {})
}
