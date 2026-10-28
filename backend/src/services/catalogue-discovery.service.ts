// Finds beginner-friendly repositories on GitHub by language and by framework
// topic, with filters that keep out label farms and the very largest projects.
// Used by the seed script and the weekly catalogue discovery job.

export const DEFAULT_LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin',
  'Ruby', 'PHP', 'C#', 'C++', 'C', 'Swift', 'Dart', 'Shell', 'Elixir',
  'Scala', 'Haskell', 'Lua', 'Zig', 'R', 'Julia', 'Vue', 'Svelte', 'Clojure'
]

// Frameworks and ecosystems, searched by GitHub topic: a language search alone
// can't find "React Native apps" or "Django projects".
export const DEFAULT_TOPICS = [
  'react-native', 'react', 'nextjs', 'vue', 'nuxt', 'angular', 'svelte', 'astro',
  'tailwindcss', 'nodejs', 'express', 'nestjs', 'deno', 'electron', 'tauri',
  'flutter', 'android', 'jetpack-compose', 'ios', 'swiftui',
  'django', 'flask', 'fastapi', 'rails', 'laravel', 'symfony', 'spring-boot',
  'dotnet', 'aspnet-core', 'godot', 'game-development', 'machine-learning',
  'deep-learning', 'pytorch', 'llm', 'data-science', 'kubernetes', 'docker',
  'terraform', 'devops', 'graphql', 'cli', 'vscode-extension', 'web-components', 'wasm'
]

export type SearchFilters = {
  /** Minimum open good first issues */
  minGoodFirstIssues: number
  /** Only repos pushed within this many days */
  pushedWithinDays: number
}

export type DiscoveryOptions = SearchFilters & {
  languages: string[]
  topics: string[]
  /** Top-starred results per language */
  perLanguage: number
  /** Extra recently-updated results per language (0 to skip) */
  activePerLanguage: number
  /** Top-starred results per topic */
  perTopic: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SearchResponse = { items?: Array<{ full_name: string; stargazers_count: number }> }

// Plain fetch so --dry-run also works without a token (at GitHub's lower
// unauthenticated search limit).
// `scope` is a search qualifier: `language:"Go"` or `topic:react-native`
export const searchRepositories = async (
  scope: string,
  options: SearchFilters,
  token: string,
  sort: 'stars' | 'updated',
  count: number
): Promise<string[]> => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const q = [
    `good-first-issues:>=${options.minGoodFirstIssues}`,
    scope,
    `pushed:>=${daysAgo(options.pushedWithinDays)}`,
    // Established projects only: new repos that mass-label "good first issue"
    // (bounty/label farms) otherwise dominate the results.
    `created:<=${daysAgo(365)}`,
    'forks:>=20',
    'archived:false',
    'is:public',
    'mirror:false',
    // Skip toy repos and the very largest projects, which are hard to land a first PR in
    'stars:200..50000'
  ].join(' ')
  // Sorting by help-wanted count rewards label farming. Stars within the band is a
  // steady proxy; a second pass by last update adds active mid-size projects.
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=${count}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Open-Source-Contributor-Matching-Platform',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok) {
    throw new Error(`GitHub search failed for ${scope}: HTTP ${response.status} ${await response.text().catch(() => '')}`.slice(0, 300))
  }
  const data = (await response.json()) as SearchResponse
  return (data.items ?? []).map((item) => item.full_name)
}

/**
 * Repositories from every language and topic search, as lowercased full name →
 * where it was found. `onScope` reports how many each search added.
 */
export const discoverRepositories = async (
  options: DiscoveryOptions,
  token: string,
  onScope: (label: string, added: number) => void = () => {}
): Promise<Map<string, string>> => {
  const found = new Map<string, string>()
  // Search API: 30 req/min authenticated, 10 unauthenticated.
  const delayMs = token ? 2_500 : 7_000
  type Pass = { sort: 'stars' | 'updated'; count: number }
  const languagePasses: Pass[] = [
    { sort: 'stars', count: options.perLanguage },
    ...(options.activePerLanguage > 0 ? [{ sort: 'updated' as const, count: options.activePerLanguage }] : [])
  ]
  const scopes = [
    ...options.languages.map((language) => ({ label: language, qualifier: `language:"${language}"`, passes: languagePasses })),
    ...options.topics.map((topic) => ({ label: `#${topic}`, qualifier: `topic:${topic}`, passes: [{ sort: 'stars' as const, count: options.perTopic }] }))
  ]
  let first = true
  for (const scope of scopes) {
    let added = 0
    for (const pass of scope.passes) {
      if (!first) await sleep(delayMs)
      first = false
      try {
        for (const fullName of await searchRepositories(scope.qualifier, options, token, pass.sort, pass.count)) {
          if (!found.has(fullName.toLowerCase())) {
            found.set(fullName.toLowerCase(), `search:${scope.label}`)
            added++
          }
        }
      } catch (err) {
        console.error(`[Discovery] ${(err as Error).message}`)
      }
    }
    onScope(scope.label, added)
  }
  return found
}
