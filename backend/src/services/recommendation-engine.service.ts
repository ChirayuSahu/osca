import { parseTuning } from './ranking-tuning.service'
import { buildReasons } from './recommendation-reasons'
import neo4j, { Session } from 'neo4j-driver'
import type { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { withSession } from '../utils/neo4j'
import { config } from '../config'
import { redisClient } from '../utils/redis-client'

const REPO_SELECT = {
  id: true,
  name: true,
  owner: true,
  fullName: true,
  provider: true,
  githubId: true,
  description: true,
  url: true,
  languages: true,
  frameworks: true,
  techStack: true,
  topics: true,
  ciCd: true,
  stars: true,
  forks: true,
  openIssuesCount: true,
  primaryLanguage: true,
  goodFirstIssueCount: true,
  helpWantedCount: true,
  hasContributingGuide: true,
  pushedAt: true,
  outsidePrMergeRate: true,
  outsidePrsMerged90d: true,
  maintainerResponseHours: true,
  unclaimedStarterIssues: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { likes: true, interactions: true }
  }
} as const

// Fallback feed used when Neo4j is unavailable or has no graph edges yet for
// this user (e.g. contributor/repository analysis hasn't run). Not personalized,
// so it leads with the most newcomer-friendly repos rather than the most starred.
export type FeedFilters = {
  /** Only repos whose largest language is this one (case-insensitive) */
  language?: string
  /** Only repos with at least one open good first issue */
  beginnerOnly?: boolean
  /** From settings: repos in these languages get a boost and are always candidates */
  preferredLanguages?: string[]
  /** From settings: repos whose largest language is one of these are left out */
  excludedLanguages?: string[]
}

export const NOT_INTERESTED_ACTION = 'REPOSITORY_NOT_INTERESTED'

const fallbackFeed = async (userId: string, page: number, limit: number, filters: FeedFilters = {}) => {
  const skip = (page - 1) * limit

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { oauthAccounts: { where: { provider: 'github' }, select: { username: true } } }
  })
  const githubUsername = user?.oauthAccounts[0]?.username

  const where: Prisma.RepositoryWhereInput = {
    hidden: false,
    archived: false,
    interactions: { none: { userId, action: NOT_INTERESTED_ACTION } },
    ...(githubUsername ? { NOT: { owner: githubUsername } } : {}),
    ...(filters.language ? { primaryLanguage: { equals: filters.language, mode: 'insensitive' } } : {}),
    ...(filters.beginnerOnly ? { goodFirstIssueCount: { gt: 0 } } : {}),
    ...(filters.excludedLanguages?.length
      ? { AND: [{ OR: [{ primaryLanguage: null }, { primaryLanguage: { notIn: filters.excludedLanguages } }] }] }
      : {})
  }

  const [repositories, total] = await Promise.all([
    prisma.repository.findMany({
      where,
      select: REPO_SELECT,
      orderBy: [{ goodFirstIssueCount: 'desc' }, { stars: 'desc' }, { id: 'asc' }],
      skip,
      take: limit
    }),
    prisma.repository.count({ where })
  ])

  return {
    feed: repositories.map((repository) => ({
      repository,
      scoreInfo: {
        repositoryId: repository.id,
        totalScore: repository.stars,
        breakdown: { contentScore: 0, collabScore: 0, topicScore: 0, keywordScore: 0, starsScore: 0, approachabilityScore: 0, fallback: true },
        reasons: buildReasons({ preferredLanguages: filters.preferredLanguages, repository })
      }
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

type GraphFeedParams = {
  userId: string
  githubId: number
  page: number
  limit: number
  skip: number
  weights: typeof config.recommendation
  filters: FeedFilters
  seed: number | null
  /** Settings that shape the ranking (not learned weights), for the visit's cache key */
  settingsKey: string
}

const toNum = (value: unknown): number => {
  if (value == null) return 0
  const boxed = value as { toNumber?: () => number }
  return typeof boxed.toNumber === 'function' ? boxed.toNumber() : Number(value)
}

// Interaction actions that mean the user already has this repo in hand, so it
// shouldn't be recommended back to them.
const ALREADY_ENGAGED_ACTIONS = ['REPOSITORY_LIKE', 'REPOSITORY_SAVE']

// Candidate repos are the UNION of three independent sources (skill match,
// topic similarity, collaborative filtering) so a user with no HAS_SKILL
// edges yet can still surface candidates via topic/collaborative signals —
// each candidate is then scored on all three dimensions together.
// Shared by the scoring and count queries so the two can't drift apart.
const CANDIDATES_CYPHER = `
    MATCH (u:User {githubId: $githubId})

    // 1. Collect all user skills, flagging which are programming languages
    // Languages the user excluded in settings don't count as skills, so matching
    // and the "why this" reasons fall back to their next best skill
    OPTIONAL MATCH (u)-[hs:HAS_SKILL]->(s:Skill)
    WHERE NOT toLower(s.name) IN $excludedLanguages
    WITH u, s, hs, EXISTS { MATCH (l:Language) WHERE toLower(l.name) = toLower(s.name) } AS isLang
    WITH u, collect(CASE WHEN s IS NULL THEN null
                         ELSE {name: toLower(s.name), score: coalesce(hs.score, 0.0), isLang: isLang} END) AS userSkills

    // 2. Candidate generation
    CALL {
      WITH u, userSkills
      UNWIND userSkills AS us
      MATCH (r:Repository)-[:USES_LANGUAGE|USES_FRAMEWORK]->(lf)
      WHERE toLower(lf.name) = us.name
      RETURN r
      UNION
      WITH u
      MATCH (u)-[:STARRED|CONTRIBUTED_TO|OWNS]->(:Repository)-[:HAS_TOPIC]->(:Topic)<-[:HAS_TOPIC]-(r:Repository)
      RETURN r
      UNION
      // Repos sharing topics with ones the user liked or saved here
      WITH u
      MATCH (u)-[i:INTERACTED_WITH]->(:Repository)-[:HAS_TOPIC]->(:Topic)<-[:HAS_TOPIC]-(r:Repository)
      WHERE i.action IN $engagedActions
      RETURN r
      UNION
      WITH u
      MATCH (u)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(:Repository)<-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]-(other:User)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r:Repository)
      WHERE other <> u
      RETURN r
      UNION
      // With a language filter, every repo in that language is a candidate, so
      // exploring a language outside the user's skills isn't limited to their
      // graph neighbourhood. (The primary-language check below narrows it.)
      WITH u
      MATCH (r:Repository)-[:USES_LANGUAGE]->(l:Language)
      WHERE $language IS NOT NULL AND toLower(l.name) = $language
      RETURN r
      UNION
      // Languages the user wants to work in (settings), even outside their skills
      WITH u
      MATCH (r:Repository)-[:USES_LANGUAGE]->(l:Language)
      WHERE toLower(l.name) IN $preferredLanguages
      RETURN r      UNION
      // Projects about what the user builds or said they're interested in
      WITH u
      MATCH (u)-[:INTERESTED_IN]->(:Keyword)<-[:HAS_KEYWORD]-(r:Repository)
      RETURN r
    }
    WITH DISTINCT u, userSkills, r
    WHERE NOT (u)-[:STARRED|CONTRIBUTED_TO|OWNS|NOT_INTERESTED]->(r)
      AND coalesce(r.archived, false) = false
      AND toLower(coalesce(r.owner, '')) <> toLower(coalesce(u.username, ''))
      AND NOT EXISTS {
        MATCH (u)-[i:INTERACTED_WITH]->(r)
        WHERE i.action IN $engagedActions
      }
      AND ($beginnerOnly = false OR coalesce(r.goodFirstIssues, 0) > 0)
      // Skip repos with no push in two years: nobody is there to review a PR
      AND (r.pushedAt IS NULL OR timestamp() - r.pushedAt < $maxIdleMs)

    // Optional language filter on the repo's largest language
    CALL {
      WITH r
      OPTIONAL MATCH (r)-[ul:USES_LANGUAGE]->(l:Language)
      WITH l, ul ORDER BY ul.bytes DESC LIMIT 1
      RETURN toLower(l.name) AS primaryLanguage
    }
    WITH u, userSkills, r, primaryLanguage
    WHERE ($language IS NULL OR primaryLanguage = $language)
      AND NOT coalesce(primaryLanguage, '') IN $excludedLanguages
`

// Experience level (settings) shifts the balance: first-timers get the most
// newcomer-friendly projects, experienced contributors more established ones.
const EXPERIENCE_TUNING: Record<string, { approachability: number; stars: number }> = {
  first: { approachability: 1.5, stars: 0.75 },
  some: { approachability: 1, stars: 1 },
  experienced: { approachability: 0.5, stars: 1.5 }
}
// Added to the score of repos in a preferred language
const PREFERRED_LANGUAGE_BOOST = 0.25

// Feed is ranked in full (up to this many repos), re-ordered for variety, then paged
const MAX_RANKED = 500
// Repos with no push for this long are left out of the feed
const MAX_IDLE_MS = 730 * 24 * 60 * 60 * 1000

type RankedRepo = {
  /** Score used for ordering: totalScore plus session shuffle, minus the seen penalty */
  rankScore: number
  repositoryId: string
  owner: string
  primaryLanguage: string | null
  totalScore: number
  contentScore: number
  collabScore: number
  topicScore: number
  keywordScore: number
  starsScore: number
  approachabilityScore: number
  // What it matched on, for the "why this" reasons
  matchedLanguage: string | null
  languageFit: number
  sharedTopics: string[]
  sharedKeywords: string[]
  collabCount: number
  /** Pulled up from further down for variety (exploration slot) */
  explore?: boolean
}

// About one slot in seven shows something from further down the ranking, in a
// language that differs from its neighbour, so the feed doesn't narrow into a rut.
// Chosen per visit (seed), so it changes between visits but not while paging.
const EXPLORE_EVERY = 7
const EXPLORE_FROM_RANK = 60
const interleaveExploration = (items: RankedRepo[], seed: number): RankedRepo[] => {
  if (items.length <= EXPLORE_FROM_RANK) return items
  const head = items.slice(0, EXPLORE_FROM_RANK)
  const rest = items.slice(EXPLORE_FROM_RANK)
  // Picks come from a shuffled copy; everything not picked keeps its ranked order
  const shuffled = [...rest].sort((a, b) => seededNoise(seed + 1, b.repositoryId) - seededNoise(seed + 1, a.repositoryId))
  const picked = new Set<string>()
  const out: RankedRepo[] = []
  for (const item of head) {
    if ((out.length + 1) % EXPLORE_EVERY === 0) {
      const prev = out[out.length - 1]?.primaryLanguage ?? null
      const pick = shuffled.find(p => !picked.has(p.repositoryId) && p.primaryLanguage !== prev)
        ?? shuffled.find(p => !picked.has(p.repositoryId))
      if (pick) {
        picked.add(pick.repositoryId)
        out.push({ ...pick, explore: true })
      }
    }
    out.push(item)
  }
  return [...out, ...rest.filter(r => !picked.has(r.repositoryId))]
}

// Kept alive while the visit keeps scrolling (each page read renews it), so a
// re-rank can't shift items across page boundaries mid-visit
const RANKING_CACHE_SECONDS = 30 * 60
// Keyed on the visit and the user's settings, so changing a setting re-ranks at
// once. Learned weights are left out on purpose: they shift with every event,
// and re-ranking mid-visit would reorder pages the user is scrolling through
// (they apply from the next visit).
const rankingCacheKey = (userId: string, seed: number, filters: FeedFilters, settingsKey: string): string => {
  const parts = JSON.stringify([filters.language ?? '', !!filters.beginnerOnly, filters.preferredLanguages ?? [], filters.excludedLanguages ?? [], settingsKey])
  let h = 2166136261
  for (let i = 0; i < parts.length; i++) h = Math.imul(h ^ parts.charCodeAt(i), 16777619) >>> 0
  return `feed:ranked:${userId}:${seed}:${h.toString(36)}`
}

// Greedy re-rank for variety: each repo already picked from the same owner costs
// 0.12, and each of the last four picks in the same language costs 0.015. Looks a
// bounded window ahead, so strong matches still lead. Deterministic for a given
// input, so pages stay stable.
const DIVERSITY_WINDOW = 30
const diversify = (items: RankedRepo[]): RankedRepo[] => {
  const remaining = [...items]
  const out: RankedRepo[] = []
  const perOwner = new Map<string, number>()
  while (remaining.length > 0) {
    const recentLangs = out.slice(-4).map(x => x.primaryLanguage)
    let bestIdx = 0
    let bestScore = -Infinity
    for (let i = 0; i < Math.min(remaining.length, DIVERSITY_WINDOW); i++) {
      const it = remaining[i]
      const ownerKey = it.owner.toLowerCase()
      const adjusted = it.rankScore
        - 0.12 * (perOwner.get(ownerKey) ?? 0)
        - 0.015 * recentLangs.filter(l => l !== null && l === it.primaryLanguage).length
      if (adjusted > bestScore) {
        bestScore = adjusted
        bestIdx = i
      }
    }
    const [pick] = remaining.splice(bestIdx, 1)
    out.push(pick)
    const ownerKey = pick.owner.toLowerCase()
    perOwner.set(ownerKey, (perOwner.get(ownerKey) ?? 0) + 1)
  }
  return out
}

// ── Freshness ────────────────────────────────────────────────────────────────
// The feed shouldn't be the same list on every visit. Each visit (the frontend's
// seed) nudges close matches into a different order, and repos first shown in an
// earlier visit within the last few days move down so new ones surface. Both are
// fixed for the whole visit, so paging never repeats or skips items.
const SHUFFLE_SPREAD = 0.08
const SEEN_PENALTY = 0.12
const SEEN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000
const shownKey = (userId: string) => `feed:shown:${userId}`

// Deterministic 0..1 per (seed, repo): FNV-1a hash
const seededNoise = (seed: number, id: string): number => {
  let h = (2166136261 ^ seed) >>> 0
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h % 10000) / 10000
}

// Repos first shown before this visit started, within the window
const loadSeenBefore = async (userId: string, seed: number): Promise<Set<string>> => {
  try {
    const ids = await redisClient.zrangebyscore(shownKey(userId), seed - SEEN_WINDOW_MS, `(${seed}`)
    return new Set(ids)
  } catch {
    return new Set()
  }
}

// First time each repo was shown (NX keeps the original time), trimmed to the window
const recordShown = async (userId: string, repoIds: string[]) => {
  if (repoIds.length === 0) return
  const key = shownKey(userId)
  const now = Date.now()
  try {
    await redisClient
      .multi()
      .zadd(key, 'NX', ...repoIds.flatMap(id => [now, id]))
      .zremrangebyscore(key, '-inf', now - SEEN_WINDOW_MS)
      .pexpire(key, SEEN_WINDOW_MS)
      .exec()
  } catch {
    // best-effort
  }
}

// Each component is squashed into [0, 1] before weighting so the configured
// weights actually control the blend (raw skill scores are 0–100+ while the
// collaborative/topic signals are small counts).
const runGraphFeed = async (session: Session, { userId, githubId, page, limit, skip, weights, filters, seed, settingsKey }: GraphFeedParams) => {
  const filterParams = {
    language: filters.language ? filters.language.toLowerCase() : null,
    beginnerOnly: !!filters.beginnerOnly,
    preferredLanguages: (filters.preferredLanguages ?? []).map(l => l.toLowerCase()),
    excludedLanguages: (filters.excludedLanguages ?? []).map(l => l.toLowerCase())
  }

  const cypher = `
    ${CANDIDATES_CYPHER}

    // 3. contentScore: does the user know the language this repo is written in?
    //    Language fit = sqrt(relative proficiency) × the language's share of the
    //    repo's code (full credit from 40%), best language wins. Frameworks add a
    //    saturating bonus (overlap / (overlap + 2)) so a long dependency list can't
    //    turn a Python monorepo into a "TypeScript match" on its own.
    OPTIONAL MATCH (r)-[ul:USES_LANGUAGE]->(lang:Language)
    WITH u, userSkills, r, primaryLanguage, collect({name: toLower(lang.name), bytes: toFloat(coalesce(ul.bytes, 0))}) AS repoLangs
    OPTIONAL MATCH (r)-[:USES_FRAMEWORK]->(fw:Framework)
    WITH u, userSkills, r, primaryLanguage, repoLangs, collect(DISTINCT toLower(fw.name)) AS repoFrameworks
    WITH u, userSkills, r, primaryLanguage, repoLangs, repoFrameworks,
         reduce(t = 0.0, l IN repoLangs | t + l.bytes) AS totalBytes,
         reduce(m = 0.0, us IN userSkills | CASE WHEN us.score > m THEN us.score ELSE m END) AS maxSkill
    WITH u, r, primaryLanguage,
         [us IN userSkills WHERE us.isLang AND maxSkill > 0 | {name: us.name, fit: sqrt(us.score / maxSkill) * CASE
            WHEN totalBytes = 0 THEN 0.0
            WHEN reduce(b = 0.0, l IN repoLangs | b + CASE WHEN l.name = us.name THEN l.bytes ELSE 0.0 END) / totalBytes >= 0.4 THEN 1.0
            ELSE reduce(b = 0.0, l IN repoLangs | b + CASE WHEN l.name = us.name THEN l.bytes ELSE 0.0 END) / totalBytes / 0.4
          END}] AS langFits,
         reduce(o = 0.0, us IN userSkills |
           o + CASE WHEN NOT us.isLang AND maxSkill > 0 AND us.name IN repoFrameworks THEN us.score / maxSkill ELSE 0.0 END) AS fwOverlap
    // The best-fitting language is kept for the "why this" reasons
    WITH u, r, primaryLanguage, fwOverlap,
         reduce(best = {name: null, fit: 0.0}, f IN langFits | CASE WHEN f.fit > best.fit THEN f ELSE best END) AS bestLang
    WITH u, r, primaryLanguage, bestLang,
         0.75 * bestLang.fit + 0.25 * (fwOverlap / (fwOverlap + 2.0)) AS contentScore

    // 4. collabScore: distinct other users who share repos with u and touched r
    CALL {
      WITH u, r
      OPTIONAL MATCH (u)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r2:Repository)<-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]-(other:User)-[:STARRED|CONTRIBUTED_TO|INTERACTED_WITH]->(r)
      WHERE r <> r2 AND other <> u
      RETURN count(DISTINCT other) AS collabCount
    }

    // 5. topicScore: topics r shares with repos the user owns/starred/contributed to,
    //    or liked/saved here
    CALL {
      WITH u, r
      OPTIONAL MATCH (u)-[rel:STARRED|CONTRIBUTED_TO|OWNS|INTERACTED_WITH]->(r3:Repository)-[:HAS_TOPIC]->(t:Topic)<-[:HAS_TOPIC]-(r)
      WHERE r <> r3 AND (type(rel) <> 'INTERACTED_WITH' OR rel.action IN $engagedActions)
      RETURN count(DISTINCT t) AS topicCount, collect(DISTINCT t.name)[..3] AS sharedTopics
    }

    // 5b. dislikes: topics r shares with repos the user marked "not for me"
    CALL {
      WITH u, r
      OPTIONAL MATCH (u)-[:NOT_INTERESTED]->(d:Repository)-[:HAS_TOPIC]->(t:Topic)<-[:HAS_TOPIC]-(r)
      RETURN count(DISTINCT t) AS dislikeCount
    }

    // 5c. keywordScore: what the project is about (keywords from its description,
    //     topics and README) against what the user builds and is interested in
    CALL {
      WITH u, r
      OPTIONAL MATCH (u)-[i:INTERESTED_IN]->(k:Keyword)<-[:HAS_KEYWORD]-(r)
      // No match still yields one row with k = null: that row must add nothing
      RETURN sum(CASE WHEN k IS NULL THEN 0.0 ELSE coalesce(i.weight, 1.0) END) AS keywordSum,
             collect(DISTINCT k.name)[..3] AS sharedKeywords
    }

    WITH r, primaryLanguage, bestLang, sharedTopics, sharedKeywords, collabCount, contentScore,
      toFloat(dislikeCount) / (dislikeCount + 3) AS dislikeScore,
      toFloat(collabCount) / (collabCount + 5) AS collabScore,
      toFloat(topicCount) / (topicCount + 3) AS topicScore,
      keywordSum / (keywordSum + 2.0) AS keywordScore,
      // log10(1M stars) = 6, so this reaches 1.0 around a million stars
      CASE WHEN log10(coalesce(r.stars, 0) + 1) / 6.0 > 1.0 THEN 1.0
           ELSE log10(coalesce(r.stars, 0) + 1) / 6.0 END AS starsScore
    // 6. approachability: how likely a first contribution is to land.
    //    Starter issues still free to pick up (falls back to the label count until
    //    measured) and help-wanted saturate at 20; activity is full within 30 days
    //    of the last push and fades to 0 at a year. Outside PR merge rate and how
    //    fast maintainers answer outsiders say whether newcomers actually succeed;
    //    unmeasured repos get neutral values.
    WITH r, primaryLanguage, bestLang, sharedTopics, sharedKeywords, collabCount,
      contentScore, collabScore, topicScore, keywordScore, starsScore, dislikeScore,
      coalesce(r.unclaimedStarters, r.goodFirstIssues, 0) AS gfi,
      coalesce(r.helpWanted, 0) AS hw,
      coalesce(r.outsideMergeRate, 0.5) AS mergeScore,
      CASE
        WHEN r.responseHours IS NULL THEN 0.5
        WHEN r.responseHours <= 24 THEN 1.0
        WHEN r.responseHours >= 336 THEN 0.0
        ELSE 1.0 - log(r.responseHours / 24.0) / log(14.0)
      END AS responseScore,
      CASE WHEN r.pushedAt IS NULL THEN null
           ELSE (timestamp() - r.pushedAt) / 86400000.0 END AS daysSincePush
    WITH r, primaryLanguage, bestLang, sharedTopics, sharedKeywords, collabCount,
      contentScore, collabScore, topicScore, keywordScore, starsScore, dislikeScore, mergeScore, responseScore,
      CASE WHEN gfi >= 20 THEN 1.0 ELSE log10(gfi + 1) / log10(21) END AS gfiScore,
      CASE WHEN hw >= 20 THEN 1.0 ELSE log10(hw + 1) / log10(21) END AS hwScore,
      CASE
        WHEN daysSincePush IS NULL THEN 0.3
        WHEN daysSincePush <= 30 THEN 1.0
        WHEN daysSincePush >= 365 THEN 0.0
        ELSE 1.0 - (daysSincePush - 30) / 335.0
      END AS activityScore,
      CASE WHEN coalesce(r.hasContributing, false) THEN 1.0 ELSE 0.0 END AS contributingScore
    WITH r, primaryLanguage, bestLang, sharedTopics, sharedKeywords, collabCount,
      contentScore, collabScore, topicScore, keywordScore, starsScore, dislikeScore,
      0.30 * gfiScore + 0.10 * hwScore + 0.15 * activityScore + 0.10 * contributingScore
        + 0.20 * mergeScore + 0.15 * responseScore AS approachabilityScore
    WITH r, primaryLanguage, bestLang, sharedTopics, sharedKeywords, collabCount,
      contentScore, collabScore, topicScore, keywordScore, starsScore, approachabilityScore,
      (contentScore * $contentWeight
        + collabScore * $collabWeight
        + topicScore * $topicWeight
        + keywordScore * $keywordWeight
        + starsScore * $starsWeight
        + approachabilityScore * $approachabilityWeight
        - dislikeScore * $dislikeWeight
        + CASE WHEN primaryLanguage IN $preferredLanguages THEN $preferredBoost ELSE 0.0 END) AS totalScore
    // r.id breaks ties so the order is stable across requests
    ORDER BY totalScore DESC, r.id ASC
    LIMIT $maxRanked

    RETURN r.id AS repositoryId, r.owner AS owner, primaryLanguage,
           totalScore, contentScore, collabScore, topicScore, keywordScore, starsScore, approachabilityScore,
           bestLang.name AS matchedLanguage, bestLang.fit AS languageFit,
           sharedTopics, sharedKeywords, collabCount
  `

  // A visit's full ranking is computed once and cached: later pages of infinite
  // scroll read it instead of re-scoring up to MAX_RANKED candidates each time
  const rankingKey = seed !== null ? rankingCacheKey(userId, seed, filters, settingsKey) : null
  const cachedRanking = rankingKey ? await redisClient.get(rankingKey).catch(() => null) : null
  if (cachedRanking && rankingKey) void redisClient.expire(rankingKey, RANKING_CACHE_SECONDS).catch(() => {})
  const ranked: RankedRepo[] = cachedRanking ? JSON.parse(cachedRanking) : await (async () => {
    const result = await session.run(cypher, {
      githubId,
      engagedActions: ALREADY_ENGAGED_ACTIONS,
      ...filterParams,
      maxIdleMs: MAX_IDLE_MS,
      maxRanked: neo4j.int(MAX_RANKED),
      contentWeight: weights.contentWeight,
      collabWeight: weights.collabWeight,
      topicWeight: weights.topicWeight,
      keywordWeight: weights.keywordWeight,
      starsWeight: weights.starsWeight,
      approachabilityWeight: weights.approachabilityWeight,
      dislikeWeight: weights.dislikeWeight,
      preferredBoost: PREFERRED_LANGUAGE_BOOST
    })

    const seen = seed !== null ? await loadSeenBefore(userId, seed) : new Set<string>()
    const diversified = diversify(result.records.map(record => {
      const repositoryId = record.get('repositoryId') as string
      const totalScore = toNum(record.get('totalScore'))
      return {
        repositoryId,
        owner: (record.get('owner') as string | null) ?? '',
        primaryLanguage: (record.get('primaryLanguage') as string | null) ?? null,
        totalScore,
        rankScore: seed === null
          ? totalScore
          : totalScore + SHUFFLE_SPREAD * seededNoise(seed, repositoryId) - (seen.has(repositoryId) ? SEEN_PENALTY : 0),
        contentScore: toNum(record.get('contentScore')),
        collabScore: toNum(record.get('collabScore')),
        topicScore: toNum(record.get('topicScore')),
        keywordScore: toNum(record.get('keywordScore')),
        starsScore: toNum(record.get('starsScore')),
        approachabilityScore: toNum(record.get('approachabilityScore')),
        matchedLanguage: (record.get('matchedLanguage') as string | null) ?? null,
        languageFit: toNum(record.get('languageFit')),
        sharedTopics: (record.get('sharedTopics') as string[] | null) ?? [],
        sharedKeywords: (record.get('sharedKeywords') as string[] | null) ?? [],
        collabCount: toNum(record.get('collabCount'))
      }
    }).sort((a, b) => b.rankScore - a.rankScore || a.repositoryId.localeCompare(b.repositoryId)))
    // Exploration only for real feed visits; unseeded callers (OscaBot) get the plain ranking
    const fresh = seed !== null ? interleaveExploration(diversified, seed) : diversified
    if (rankingKey) await redisClient.set(rankingKey, JSON.stringify(fresh), 'EX', RANKING_CACHE_SECONDS).catch(() => {})
    return fresh
  })()
  const total = ranked.length

  // No graph candidates at all: serve the popularity feed for every page.
  // Otherwise an empty page just means the graph feed has ended — falling back
  // there would splice a different feed in and repeat items forever.
  if (total === 0) {
    return fallbackFeed(userId, page, limit, filters)
  }

  let recommendations = ranked.slice(skip, skip + limit)
  // A cached ranking predates anything hidden, liked or saved since; drop those
  // here (the page just comes back shorter, the order of the rest is kept)
  if (cachedRanking && recommendations.length > 0) {
    const acted = await prisma.userInteraction.findMany({
      where: {
        userId,
        repositoryId: { in: recommendations.map(r => r.repositoryId) },
        action: { in: [NOT_INTERESTED_ACTION, ...ALREADY_ENGAGED_ACTIONS] }
      },
      select: { repositoryId: true }
    })
    const drop = new Set(acted.map(a => a.repositoryId))
    if (drop.size > 0) recommendations = recommendations.filter(r => !drop.has(r.repositoryId))
  }
  if (seed !== null) void recordShown(userId, recommendations.map(r => r.repositoryId))
  const repoIds = recommendations.map(r => r.repositoryId)

  // Fetch full repository data from Prisma based on the IDs returned by Neo4j.
  // `hidden` lives only in Postgres, so it's enforced here.
  const repositories = repoIds.length === 0 ? [] : await prisma.repository.findMany({
    where: { id: { in: repoIds }, hidden: false, archived: false },
    select: REPO_SELECT
  })
  const repositoriesById = new Map(repositories.map(r => [r.id, r]))

  // Map the Prisma repositories back to the scored recommendations
  const feed = recommendations.flatMap(rec => {
    const repository = repositoriesById.get(rec.repositoryId)
    if (!repository) return []
    return [{
      repository,
      scoreInfo: {
        repositoryId: rec.repositoryId,
        totalScore: rec.totalScore,
        breakdown: {
          contentScore: rec.contentScore,
          collabScore: rec.collabScore,
          topicScore: rec.topicScore,
          keywordScore: rec.keywordScore,
          starsScore: rec.starsScore,
          approachabilityScore: rec.approachabilityScore
        },
        reasons: buildReasons({ ...rec, preferredLanguages: filters.preferredLanguages, repository })
      }
    }]
  })

  const totalPages = Math.ceil(total / limit)

  return {
    feed,
    total,
    page,
    limit,
    totalPages
  }
}

/**
 * @param seed Per-visit seed (the frontend sends its visit start time). With it the
 *   order is shuffled among close matches and freshened against earlier visits;
 *   without it (e.g. OscaBot's candidates) the ranking is purely by score.
 */
export const generateFeed = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
  filters: FeedFilters = {},
  seed: number | null = null
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      oauthAccounts: { where: { provider: 'github' } },
      experienceLevel: true,
      preferredLanguages: true,
      excludedLanguages: true,
      interestAreas: true,
      rankingTuning: true
    }
  })
  if (user) {
    filters = { ...filters, preferredLanguages: user.preferredLanguages, excludedLanguages: user.excludedLanguages }
  }

  if (!user || !user.oauthAccounts[0]?.providerId) {
    return fallbackFeed(userId, page, limit, filters)
  }

  const githubId = parseInt(user.oauthAccounts[0].providerId, 10)
  if (isNaN(githubId)) {
    return fallbackFeed(userId, page, limit, filters)
  }
  const skip = (page - 1) * limit
  // Experience level (settings) and what this user's own behaviour taught us
  const experience = EXPERIENCE_TUNING[user.experienceLevel] ?? EXPERIENCE_TUNING.first
  const learned = parseTuning(user.rankingTuning)
  const base = config.recommendation
  const weights = {
    ...base,
    contentWeight: base.contentWeight * learned.content,
    collabWeight: base.collabWeight * learned.collab,
    topicWeight: base.topicWeight * learned.topic,
    keywordWeight: base.keywordWeight * learned.keyword,
    starsWeight: base.starsWeight * experience.stars * learned.stars,
    approachabilityWeight: base.approachabilityWeight * experience.approachability * learned.approachability
  }

  try {
    const settingsKey = JSON.stringify([user.experienceLevel, user.interestAreas])
    return await withSession(session => runGraphFeed(session, { userId, githubId, page, limit, skip, weights, filters, seed, settingsKey }))
  } catch (error) {
    console.error(`[RecommendationEngine] Failed to generate feed from Neo4j for user ${userId}:`, error)
    return fallbackFeed(userId, page, limit, filters)
  }
}

// Primary languages present in the catalogue, for the feed's language filter.
export const listFeedLanguages = async (): Promise<{ language: string; count: number }[]> => {
  const rows = await prisma.repository.groupBy({
    by: ['primaryLanguage'],
    where: { hidden: false, archived: false, primaryLanguage: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { primaryLanguage: 'desc' } },
    take: 30
  })
  return rows.map(row => ({ language: row.primaryLanguage as string, count: row._count._all }))
}

// Forgets which repos the feed has shown this user (account deletion)
export const clearFeedHistory = async (userId: string): Promise<void> => {
  await redisClient.del(shownKey(userId))
}

export const RecommendationEngineService = {
  generateFeed,
  listFeedLanguages
}
