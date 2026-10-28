import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { redisClient } from '../../utils/redis-client'
import { config } from '../../config'
import { getGithubAccessToken, githubGetResponse } from '../../lib/github'
import { NOT_INTERESTED_ACTION } from '../../services/recommendation-engine.service'

// Request-aware candidates for OscaBot: what the user is asking for right now,
// from our catalogue first and live GitHub search when the catalogue is thin.

export type Candidate = {
  /** Catalogue id; null for repos found live on GitHub (not imported yet) */
  id: string | null
  fullName: string
  description: string
  languages: string[]
  topics: string[]
  stars: number
  goodFirstIssues: number | null
  hasContributingGuide: boolean
  /** Picked because it fits what the user just asked for */
  matchesRequest: boolean
}

export type ChatIntent = { languages: string[]; keywords: string[] }

type HistoryMessage = { role: string; content: string }

/* ─── Intent ───────────────────────────────────────────────────────────────── */

const LANGUAGES: Record<string, string> = {
  typescript: 'TypeScript', ts: 'TypeScript', javascript: 'JavaScript', js: 'JavaScript', node: 'JavaScript',
  'node.js': 'JavaScript', nodejs: 'JavaScript', python: 'Python', py: 'Python', golang: 'Go', rust: 'Rust',
  java: 'Java', kotlin: 'Kotlin', swift: 'Swift', ruby: 'Ruby', php: 'PHP', 'c#': 'C#', csharp: 'C#',
  'c++': 'C++', cpp: 'C++', dart: 'Dart', elixir: 'Elixir', haskell: 'Haskell', scala: 'Scala', lua: 'Lua',
  zig: 'Zig', julia: 'Julia', r: 'R'
}

// "go" and "c" are common words, so they only count in a clearly technical phrase
const GO_PHRASE = /\b(?:in|with|learn|learning|write|writing|using)\s+go\b|\bgo\s+(?:projects?|repos?|repositories|developer|dev|code|language|lang|backend|services?)\b/i
const C_PHRASE = /\b(?:in|with|learn|write|using)\s+c\b(?![+#])|\bc\s+(?:projects?|repos?|language|code)\b/i

// Words that broaden into the topic slugs GitHub repos actually use
const SYNONYMS: Record<string, string[]> = {
  ml: ['machine-learning', 'deep-learning', 'ml'],
  ai: ['ai', 'llm', 'machine-learning'],
  llm: ['llm', 'ai', 'generative-ai'],
  cli: ['cli', 'command-line', 'terminal'],
  terminal: ['terminal', 'cli'],
  frontend: ['frontend', 'ui', 'react', 'vue'],
  backend: ['backend', 'api', 'server'],
  web: ['web', 'frontend', 'webapp'],
  devops: ['devops', 'kubernetes', 'docker', 'ci'],
  game: ['game', 'gamedev', 'game-engine'],
  games: ['game', 'gamedev', 'game-engine'],
  database: ['database', 'sql', 'postgres'],
  security: ['security', 'cybersecurity'],
  mobile: ['mobile', 'android', 'ios'],
  docs: ['documentation', 'docs'],
  data: ['data', 'data-science', 'analytics'],
  editor: ['editor', 'text-editor'],
  compiler: ['compiler', 'programming-language'],
  blockchain: ['blockchain', 'web3', 'ethereum']
}

const STOPWORDS = new Set(
  ('a an and are as at be but by can could do does for from get give good have help how i if im in into is it its ' +
    'just know like looking me more my new of on or our please project projects recommend repo repos repository ' +
    'repositories show so some start started starting suggest than that the their them then there these they this ' +
    'to want was we what when where which who why will with would you your beginner beginners friendly first issue ' +
    'issues contribute contributing contribution contributions open source opensource find any something dev developer ' +
    'learn learning where should also really maybe about need work working next now today think best top cool ' +
    'interesting great nice easy simple small big large popular active good-first tell give list show want')
    .split(' ')
)

// Multi-word phrases folded into one keyword before splitting into words
const PHRASES: [RegExp, string][] = [
  [/\b(?:machine|deep)[\s-]learning\b/g, ' ml '],
  [/\bartificial intelligence\b/g, ' ai '],
  [/\bcommand[\s-]line\b/g, ' cli '],
  [/\bdata[\s-]science\b/g, ' data '],
  [/\bweb[\s-]?(?:dev|development|apps?)\b/g, ' web '],
  [/\bgame[\s-]?(?:dev|development)\b/g, ' game '],
  [/\btext[\s-]editors?\b/g, ' editor ']
]

/** Languages and topic keywords from the latest user messages (newest first) */
export const extractIntent = (history: HistoryMessage[]): ChatIntent => {
  const userText = history
    .filter(m => m.role === 'user')
    .slice(-2)
    .map(m => m.content)
    .join(' ')
  const lower = PHRASES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), userText.toLowerCase())

  const languages = new Set<string>()
  const keywords = new Set<string>()
  for (const raw of lower.split(/[^a-z0-9+#.\-]+/)) {
    const word = raw.replace(/^[.\-]+|[.\-]+$/g, '')
    if (!word) continue
    if (word !== 'r' && LANGUAGES[word]) {
      languages.add(LANGUAGES[word])
      continue
    }
    if (word.length < 3 || STOPWORDS.has(word) || /^\d+$/.test(word)) {
      if (SYNONYMS[word]) SYNONYMS[word].forEach(k => keywords.add(k))
      continue
    }
    keywords.add(word)
    SYNONYMS[word]?.forEach(k => keywords.add(k))
  }
  if (GO_PHRASE.test(userText)) languages.add('Go')
  if (C_PHRASE.test(userText)) languages.add('C')

  return { languages: [...languages], keywords: [...keywords].slice(0, 8) }
}

/* ─── Catalogue search ─────────────────────────────────────────────────────── */

const CATALOGUE_SELECT = {
  id: true,
  fullName: true,
  owner: true,
  description: true,
  languages: true,
  primaryLanguage: true,
  topics: true,
  frameworks: true,
  stars: true,
  goodFirstIssueCount: true,
  hasContributingGuide: true
} as const

type CatalogueRepo = Prisma.RepositoryGetPayload<{ select: typeof CATALOGUE_SELECT }>

const topLanguages = (languages: unknown): string[] =>
  languages && typeof languages === 'object'
    ? Object.entries(languages as Record<string, number>)
        .sort(([, a], [, b]) => Number(b) - Number(a))
        .slice(0, 5)
        .map(([name]) => name)
    : []

export const toCandidate = (repo: CatalogueRepo, matchesRequest: boolean): Candidate => ({
  id: repo.id,
  fullName: repo.fullName,
  description: (repo.description ?? '').replace(/\s+/g, ' ').trim(),
  languages: topLanguages(repo.languages),
  topics: repo.topics.slice(0, 5),
  stars: repo.stars,
  goodFirstIssues: repo.goodFirstIssueCount,
  hasContributingGuide: repo.hasContributingGuide,
  matchesRequest
})

const searchCatalogue = async (userId: string, intent: ChatIntent, excludeOwner: string | null, limit: number) => {
  const { languages, keywords } = intent
  const or: Prisma.RepositoryWhereInput[] = []
  if (languages.length) or.push({ primaryLanguage: { in: languages, mode: 'insensitive' } })
  if (keywords.length) {
    or.push({ topics: { hasSome: keywords } })
    keywords.forEach(k => or.push({ description: { contains: k, mode: 'insensitive' } }))
  }
  if (or.length === 0) return []

  const rows = await prisma.repository.findMany({
    where: {
      hidden: false,
      archived: false,
      interactions: { none: { userId, action: NOT_INTERESTED_ACTION } },
      ...(excludeOwner ? { NOT: { owner: { equals: excludeOwner, mode: 'insensitive' } } } : {}),
      OR: or
    },
    select: CATALOGUE_SELECT,
    take: 80
  })

  const langSet = new Set(languages.map(l => l.toLowerCase()))
  const scored = rows.map(repo => {
    const text = `${repo.description ?? ''} ${repo.fullName}`.toLowerCase()
    const topics = new Set(repo.topics.map(t => t.toLowerCase()))
    const frameworks = new Set(repo.frameworks.map(f => f.toLowerCase()))
    const langHit = repo.primaryLanguage ? langSet.has(repo.primaryLanguage.toLowerCase()) : false
    const topicHits = keywords.filter(k => topics.has(k)).length
    const textHits = keywords.filter(k => text.includes(k)).length
    const frameworkHits = keywords.filter(k => frameworks.has(k)).length
    // Asked for a language: other-language repos only count with a strong topic match
    if (langSet.size > 0 && !langHit && topicHits + frameworkHits < 2) return null
    const score =
      (langHit ? 3 : 0) +
      2 * topicHits +
      textHits +
      frameworkHits +
      (repo.goodFirstIssueCount > 0 ? 0.6 : 0) +
      (repo.hasContributingGuide ? 0.3 : 0) +
      Math.log10(repo.stars + 1) / 10
    return { repo, score, langHit }
  })

  // A named language comes first: Rust CLIs before Go CLIs for "Rust CLI tools"
  return scored
    .filter((x): x is { repo: CatalogueRepo; score: number; langHit: boolean } => x !== null && x.score >= 1.5)
    .sort((a, b) => Number(b.langHit) - Number(a.langHit) || b.score - a.score)
    .slice(0, limit)
    .map(x => toCandidate(x.repo, true))
}

/* ─── Live GitHub search (when the catalogue is thin) ─────────────────────── */

const GITHUB_CACHE_SECONDS = 30 * 60
const ACTIVE_WITHIN_DAYS = 180

type GithubSearchItem = {
  full_name: string
  description: string | null
  language: string | null
  topics?: string[]
  stargazers_count: number
  archived: boolean
  fork: boolean
}

const searchGithubLive = async (userId: string, intent: ChatIntent, limit: number): Promise<Candidate[]> => {
  const since = new Date(Date.now() - ACTIVE_WITHIN_DAYS * 86_400_000).toISOString().slice(0, 10)
  const terms = intent.keywords.filter(k => !k.includes('-')).slice(0, 2)
  const qualifiers = [
    ...intent.languages.slice(0, 2).map(l => `language:"${l}"`),
    'good-first-issues:>2',
    'archived:false',
    'fork:false',
    `pushed:>${since}`,
    'stars:>50'
  ]
  const query = [...terms, ...qualifiers].join(' ')
  const cacheKey = `chat:gh-search:${query}`

  try {
    const cached = await redisClient.get(cacheKey)
    if (cached) return JSON.parse(cached) as Candidate[]
  } catch {
    // cache is best-effort
  }

  const path = `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`
  let response: Response
  try {
    response = await githubGetResponse(path, await getGithubAccessToken(userId))
  } catch (err) {
    if (!config.githubServerToken) throw err
    response = await githubGetResponse(path, config.githubServerToken)
  }
  const data = (await response.json()) as { items?: GithubSearchItem[] }
  const candidates: Candidate[] = (data.items ?? [])
    .filter(item => !item.archived && !item.fork)
    .map(item => ({
      id: null,
      fullName: item.full_name,
      description: (item.description ?? '').replace(/\s+/g, ' ').trim(),
      languages: item.language ? [item.language] : [],
      topics: (item.topics ?? []).slice(0, 5),
      stars: item.stargazers_count,
      goodFirstIssues: null,
      hasContributingGuide: false,
      matchesRequest: true
    }))

  try {
    await redisClient.set(cacheKey, JSON.stringify(candidates), 'EX', GITHUB_CACHE_SECONDS)
  } catch {
    // cache is best-effort
  }
  return candidates
}

/* ─── Entry point ──────────────────────────────────────────────────────────── */

const REQUEST_MATCHES = 10
const MIN_CATALOGUE_MATCHES = 4
const LIVE_MATCHES = 6

/**
 * Candidates that fit the user's latest request: catalogue matches, topped up
 * with live GitHub results when the catalogue has fewer than a handful.
 * Empty when the request names no language or topic.
 */
export const retrieveRequestCandidates = async (
  userId: string,
  history: HistoryMessage[],
  excludeOwner: string | null
): Promise<{ intent: ChatIntent; candidates: Candidate[] }> => {
  const intent = extractIntent(history)
  if (intent.languages.length === 0 && intent.keywords.length === 0) return { intent, candidates: [] }

  let catalogue: Candidate[] = []
  try {
    catalogue = await searchCatalogue(userId, intent, excludeOwner, REQUEST_MATCHES)
  } catch (error) {
    console.warn('[OscaBot] catalogue search failed', error)
  }
  if (catalogue.length >= MIN_CATALOGUE_MATCHES) return { intent, candidates: catalogue }

  let live: Candidate[] = []
  try {
    const known = new Set(catalogue.map(c => c.fullName.toLowerCase()))
    live = (await searchGithubLive(userId, intent, LIVE_MATCHES + 4))
      .filter(c => !known.has(c.fullName.toLowerCase()))
      .filter(c => !excludeOwner || !c.fullName.toLowerCase().startsWith(`${excludeOwner.toLowerCase()}/`))
      .slice(0, LIVE_MATCHES)
  } catch (error) {
    console.warn('[OscaBot] live GitHub search failed', error)
  }
  return { intent, candidates: [...catalogue, ...live] }
}
