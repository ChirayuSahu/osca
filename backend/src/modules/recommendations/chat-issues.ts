import { prisma } from '../../utils/prisma'
import { config } from '../../config'
import { getGithubAccessToken, githubGetResponse } from '../../lib/github'
import { RepositoryService } from '../repositories/service'
import { isValidRepoRef } from '../../lib/github/utils/parse-github-url'

// "Show me issues in excalidraw" — answered with real issues from GitHub rather
// than the model, so nothing is made up.

type HistoryMessage = { role: string; content: string }

export type ChatIssue = {
  number: number
  title: string
  url: string
  comments: number
  assigned: boolean
  labels: { name: string; color: string }[]
}

export type ChatIssues = {
  repository: string // owner/repo
  repositoryId: string | null
  url: string
  /** good-first: labelled starter issues; recent: no starter labels, so recently active issues */
  kind: 'good-first' | 'recent'
  items: ChatIssue[]
}

type RepoRef = { owner: string; repo: string; repositoryId: string | null }

const ISSUE_WORDS = /\b(issues?|tasks?|bugs?|tickets?|good[\s-]first[\s-]issues?)\b/i
const OWNER_REPO = /\b([\w.-]+)\/([\w.-]+)\b/
const GITHUB_URL = /github\.com\/([\w.-]+)\/([\w.-]+)/i
// "issues in/from/for X", "X issues", "X's issues"
const AFTER_PREPOSITION = /\b(?:issues?|tasks?|bugs?)\b[^.?!]*?\b(?:in|from|for|on|of|at)\s+(?:the\s+)?([\w.-]+)/i
const BEFORE_ISSUES = /\b([\w.-]+?)(?:'s)?\s+(?:good[\s-]first\s+|open\s+|starter\s+)?issues\b/i
const ORDINALS: Record<string, number> = {
  first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, fifth: 4, '5th': 4
}
const GENERIC = new Set([
  'good', 'first', 'open', 'some', 'any', 'the', 'these', 'those', 'beginner', 'easy', 'starter', 'new', 'more',
  'python', 'rust', 'go', 'typescript', 'javascript', 'java', 'react', 'repos', 'repositories', 'projects', 'github'
])

const clean = (name: string) => name.replace(/\.git$/i, '').replace(/[.,;:!?)]+$/, '')

// Repos linked in the bot's previous reply, in order
const lastRecommended = (history: HistoryMessage[]): { owner: string; repo: string }[] => {
  const last = [...history].reverse().find(m => m.role === 'assistant')
  if (!last) return []
  return [...last.content.matchAll(/\]\(https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)\/?\)/gi)].map(m => ({
    owner: m[1],
    repo: clean(m[2])
  }))
}

const findInCatalogue = async (name: string) =>
  prisma.repository.findFirst({
    where: { hidden: false, OR: [{ name: { equals: name, mode: 'insensitive' } }, { fullName: { equals: name, mode: 'insensitive' } }] },
    orderBy: { stars: 'desc' },
    select: { id: true, owner: true, name: true }
  })

/** The repository the user wants issues from, or null if this isn't an issues request */
export const detectIssueRequest = async (history: HistoryMessage[]): Promise<RepoRef | null> => {
  const text = [...history].reverse().find(m => m.role === 'user')?.content ?? ''
  if (!ISSUE_WORDS.test(text)) return null

  const withId = async (owner: string, repo: string): Promise<RepoRef | null> => {
    // Names go into GitHub API paths; anything malformed is ignored
    if (!isValidRepoRef(owner, repo)) return null
    const known = await findInCatalogue(`${owner}/${repo}`)
    return { owner, repo, repositoryId: known?.id ?? null }
  }

  const url = text.match(GITHUB_URL)
  if (url) return withId(url[1], clean(url[2]))
  const pair = text.match(OWNER_REPO)
  if (pair && !/^(and|or)$/i.test(pair[1])) {
    const ref = await withId(pair[1], clean(pair[2]))
    if (ref) return ref
  }

  // "the second one", "that repo": point back at the previous recommendations
  const previous = lastRecommended(history)
  if (previous.length) {
    const ordinal = text.toLowerCase().match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\b/)
    const index = ordinal ? ORDINALS[ordinal[1]] : /\b(this|that|it|its|the)\s+(one|repo|repository|project)\b/i.test(text) ? 0 : -1
    if (index >= 0 && previous[index]) return withId(previous[index].owner, previous[index].repo)
  }

  // A repo name from our catalogue: "issues in excalidraw", "tiptap issues"
  for (const pattern of [AFTER_PREPOSITION, BEFORE_ISSUES]) {
    const word = text.match(pattern)?.[1]
    if (!word || GENERIC.has(word.toLowerCase()) || word.length < 3) continue
    const known = await findInCatalogue(clean(word))
    if (known) return { owner: known.owner, repo: known.name, repositoryId: known.id }
  }
  return null
}

type GithubIssue = {
  number: number
  title: string
  html_url: string
  comments: number
  assignees?: unknown[]
  labels?: ({ name?: string; color?: string } | string)[]
  pull_request?: unknown
}

const RECENT_LIMIT = 8

const recentIssues = async (userId: string, owner: string, repo: string): Promise<ChatIssue[]> => {
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&sort=updated&per_page=20`
  let response: Response
  try {
    response = await githubGetResponse(path, await getGithubAccessToken(userId))
  } catch (err) {
    if (!config.githubServerToken) throw err
    response = await githubGetResponse(path, config.githubServerToken)
  }
  const issues = (await response.json()) as GithubIssue[]
  return issues
    .filter(i => !i.pull_request)
    .slice(0, RECENT_LIMIT)
    .map(i => ({
      number: i.number,
      title: i.title,
      url: i.html_url,
      comments: i.comments,
      assigned: (i.assignees?.length ?? 0) > 0,
      labels: (i.labels ?? [])
        .map(l => (typeof l === 'string' ? { name: l, color: '888888' } : { name: l.name ?? '', color: l.color ?? '888888' }))
        .filter(l => l.name)
        .slice(0, 4)
    }))
}

/** Starter issues for the repo, or recently active open issues when it has none */
export const fetchIssuesForChat = async (userId: string, ref: RepoRef): Promise<ChatIssues> => {
  const base = {
    repository: `${ref.owner}/${ref.repo}`,
    repositoryId: ref.repositoryId,
    url: `https://github.com/${ref.owner}/${ref.repo}`
  }
  const starter = await RepositoryService.listStarterIssues(userId, ref.owner, ref.repo)
  if (starter.length > 0) {
    return {
      ...base,
      kind: 'good-first',
      items: starter.map(i => ({ number: i.number, title: i.title, url: i.url, comments: i.comments, assigned: i.assigned, labels: i.labels }))
    }
  }
  return { ...base, kind: 'recent', items: await recentIssues(userId, ref.owner, ref.repo) }
}
