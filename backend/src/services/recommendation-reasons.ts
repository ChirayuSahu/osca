// "Why this?" reasons for a recommendation: short, factual, strongest first.
// Built from what the ranking matched on plus the repo's newcomer signals.

export type ReasonKind = 'preferred' | 'language' | 'keywords' | 'topics' | 'people' | 'starters' | 'merges' | 'responsive' | 'active' | 'explore'

export type Reason = { kind: ReasonKind; text: string }

export type ReasonInput = {
  matchedLanguage?: string | null
  languageFit?: number
  sharedTopics?: string[]
  sharedKeywords?: string[]
  collabCount?: number
  explore?: boolean
  preferredLanguages?: string[]
  repository: {
    primaryLanguage: string | null
    /** GitHub's language breakdown; gives the proper spelling of a language */
    languages?: unknown
    goodFirstIssueCount: number
    unclaimedStarterIssues: number | null
    outsidePrsMerged90d: number | null
    outsidePrMergeRate: number | null
    maintainerResponseHours: number | null
    pushedAt: Date | null
  }
}

const MAX_REASONS = 3
const DAY_MS = 24 * 60 * 60 * 1000

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// "typescript" → "TypeScript", using the repo's own language names
const languageName = (lower: string, languages: unknown): string => {
  const names = languages && typeof languages === 'object' ? Object.keys(languages as object) : []
  return names.find(n => n.toLowerCase() === lower) ?? capitalize(lower)
}
const list = (items: string[]) => items.slice(0, 2).join(', ')

const responseText = (hours: number): string =>
  hours <= 24 ? 'Maintainers usually reply within a day' : `Maintainers usually reply within ${Math.ceil(hours / 24)} days`

export const buildReasons = (input: ReasonInput): Reason[] => {
  const repo = input.repository
  // Each candidate reason has a strength; the strongest few are shown
  const candidates: Array<Reason & { strength: number }> = []

  if (input.explore) candidates.push({ kind: 'explore', text: 'Something different to explore', strength: 10 })

  const lang = repo.primaryLanguage
  if (lang && input.preferredLanguages?.some(p => p.toLowerCase() === lang.toLowerCase())) {
    candidates.push({ kind: 'preferred', text: `${lang}, which you want to work in`, strength: 9 })
  } else if (input.matchedLanguage && (input.languageFit ?? 0) >= 0.5) {
    const name = languageName(input.matchedLanguage, repo.languages)
    candidates.push({
      kind: 'language',
      text: (input.languageFit ?? 0) >= 0.85 ? `Written in ${name}, which you write a lot` : `Uses ${name}, which you know`,
      strength: 8
    })
  }

  const unclaimed = repo.unclaimedStarterIssues ?? repo.goodFirstIssueCount
  if (unclaimed > 0) {
    candidates.push({
      kind: 'starters',
      text: unclaimed === 1 ? '1 starter issue free to pick up' : `${unclaimed} starter issues free to pick up`,
      strength: unclaimed >= 5 ? 7.5 : 6
    })
  }
  if ((repo.outsidePrsMerged90d ?? 0) >= 3) {
    candidates.push({ kind: 'merges', text: `Merged ${repo.outsidePrsMerged90d} outside PRs in 90 days`, strength: 7 })
  } else if ((repo.outsidePrMergeRate ?? 0) >= 0.6) {
    candidates.push({ kind: 'merges', text: 'Merges most outside contributions', strength: 6.5 })
  }
  if (repo.maintainerResponseHours !== null && repo.maintainerResponseHours <= 72) {
    candidates.push({ kind: 'responsive', text: responseText(repo.maintainerResponseHours), strength: 6.8 })
  }

  if (input.sharedKeywords?.length) {
    candidates.push({ kind: 'keywords', text: `About ${list(input.sharedKeywords)}, like your work`, strength: 6.6 })
  }
  if (input.sharedTopics?.length) {
    candidates.push({ kind: 'topics', text: `Shares topics with your repos: ${list(input.sharedTopics)}`, strength: 5.5 })
  }
  if ((input.collabCount ?? 0) >= 1) {
    const n = input.collabCount as number
    candidates.push({ kind: 'people', text: n === 1 ? 'A developer like you is active here' : `${n} developers like you are active here`, strength: 5 })
  }
  if (repo.pushedAt && Date.now() - repo.pushedAt.getTime() <= 7 * DAY_MS) {
    candidates.push({ kind: 'active', text: 'Active this week', strength: 3 })
  }

  return candidates
    .sort((a, b) => b.strength - a.strength)
    .slice(0, MAX_REASONS)
    .map(({ kind, text }) => ({ kind, text }))
}
