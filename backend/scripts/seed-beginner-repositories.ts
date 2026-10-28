/**
 * Seeds repositories that are friendly to first-time open-source contributors:
 * a curated list plus GitHub search discovery (repos with open "good first issue"
 * issues, recently pushed, not archived) across popular languages.
 *
 * Each repo is enqueued as a system repository-analysis job, which runs on the
 * server GITHUB_TOKEN and syncs the repo (with its approachability signals) into
 * Postgres and Neo4j. A worker must be running to process the jobs.
 *
 * Usage:
 *   npm run seed:beginner -- [options]
 *
 * Options:
 *   --dry-run                     Print what would be enqueued; enqueue nothing
 *   --per-language=N              Search results per language (default 10, max 100)
 *   --min-good-first-issues=N     Search threshold for open good first issues (default 5)
 *   --pushed-within-days=N        Only repos pushed within N days (default 90)
 *   --languages=a,b,c             Override the language list for search
 *   --no-curated                  Skip the curated list
 *   --no-search                   Skip GitHub search discovery
 *   --if-empty                    Fresh-database mode: seed only when no repositories
 *                                 exist yet, and skip (exit 0) when GITHUB_TOKEN is unset
 */
import { config } from '../src/config'
import { prisma } from '../src/utils/prisma'
import { JobEnqueueService } from '../src/services/job-enqueue.service'
import { closeAllQueues, getQueue, QUEUE_NAMES } from '../src/config/queue'

// Well-known projects with active newcomer programs, labelled starter issues
// and contributing guides. Discovery below keeps the catalogue fresh beyond these.
const CURATED_REPOS: string[] = [
  // Learning-by-contributing
  'firstcontributions/first-contributions',
  'freeCodeCamp/freeCodeCamp',
  'public-apis/public-apis',
  'mdn/content',
  'exercism/python',
  'exercism/javascript',
  'TheAlgorithms/Python',
  'TheAlgorithms/JavaScript',
  'TheAlgorithms/Java',
  'TheAlgorithms/Go',
  'TheAlgorithms/Rust',
  'TheAlgorithms/C-Plus-Plus',
  'rust-lang/rustlings',

  // JavaScript / TypeScript
  'processing/p5.js',
  'excalidraw/excalidraw',
  'withastro/astro',
  'vitejs/vite',
  'hoppscotch/hoppscotch',
  'appwrite/appwrite',
  'calcom/cal.com',
  'nodejs/node',

  // Python
  'oppia/oppia',
  'zulip/zulip',
  'wagtail/wagtail',
  'Textualize/textual',
  'Textualize/rich',
  'httpie/cli',
  'scikit-learn/scikit-learn',
  'pandas-dev/pandas',
  'matplotlib/matplotlib',
  'sympy/sympy',
  'astropy/astropy',
  'home-assistant/core',
  'python-poetry/poetry',

  // Go
  'cli/cli',
  'jesseduffield/lazygit',
  'charmbracelet/bubbletea',
  'spf13/cobra',
  'gohugoio/hugo',
  'kubernetes/website',

  // Rust
  'nushell/nushell',
  'uutils/coreutils',
  'astral-sh/ruff',
  'rust-lang/rust-clippy',
  'servo/servo',

  // Ruby
  'rubyforgood/human-essentials',
  'rubyforgood/casa',
  'publiclab/plots2',

  // Java / Kotlin / Android
  'JabRef/jabref',
  'ankidroid/Anki-Android',
  'thunderbird/thunderbird-android',

  // C# / .NET
  'files-community/Files',
  'ShareX/ShareX',
  'microsoft/PowerToys',
  'PowerShell/PowerShell',

  // Dart / Flutter
  'openfoodfacts/smooth-app',

  // Infra / cloud native
  'meshery/meshery',
  'keploy/keploy'
]

const DEFAULT_LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin',
  'Ruby', 'PHP', 'C#', 'C++', 'Swift', 'Dart'
]

type Options = {
  dryRun: boolean
  ifEmpty: boolean
  perLanguage: number
  minGoodFirstIssues: number
  pushedWithinDays: number
  languages: string[]
  curated: boolean
  search: boolean
}

const parseOptions = (argv: string[]): Options => {
  const value = (name: string): string | undefined =>
    argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
  const int = (name: string, fallback: number, max = Infinity): number => {
    const parsed = parseInt(value(name) ?? '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
  }

  return {
    dryRun: argv.includes('--dry-run'),
    ifEmpty: argv.includes('--if-empty'),
    perLanguage: int('per-language', 10, 100),
    minGoodFirstIssues: int('min-good-first-issues', 5),
    pushedWithinDays: int('pushed-within-days', 90),
    languages: value('languages')?.split(',').map((l) => l.trim()).filter(Boolean) ?? DEFAULT_LANGUAGES,
    curated: !argv.includes('--no-curated'),
    search: !argv.includes('--no-search')
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SearchResponse = { items?: Array<{ full_name: string; stargazers_count: number }> }

// Plain fetch so --dry-run also works without a token (at GitHub's lower
// unauthenticated search limit).
const searchLanguage = async (language: string, options: Options, token: string): Promise<string[]> => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const q = [
    `good-first-issues:>=${options.minGoodFirstIssues}`,
    `language:"${language}"`,
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
  // Sorting by help-wanted count rewards label farming; stars within the band is a steadier proxy
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${options.perLanguage}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Open-Source-Contributor-Matching-Platform',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok) {
    throw new Error(`GitHub search failed for ${language}: HTTP ${response.status} ${await response.text().catch(() => '')}`.slice(0, 300))
  }
  const data = (await response.json()) as SearchResponse
  return (data.items ?? []).map((item) => item.full_name)
}

const main = async () => {
  const options = parseOptions(process.argv.slice(2))
  const token = config.githubServerToken

  // Runs as part of database setup, so it must never block startup.
  if (options.ifEmpty) {
    const existing = await prisma.repository.count()
    if (existing > 0) {
      console.log(`[SeedBeginner] ${existing} repositories already present — skipping seed.`)
      return
    }
    // Repos only land in Postgres once workers analyze them, so a restart before
    // that would otherwise look like a fresh database.
    const counts = await getQueue(QUEUE_NAMES.REPOSITORY_ANALYSIS).getJobCounts('waiting', 'active', 'delayed', 'completed')
    const pending = Object.values(counts).reduce((sum, n) => sum + n, 0)
    if (pending > 0) {
      console.log(`[SeedBeginner] ${pending} repository-analysis jobs already queued — skipping seed.`)
      return
    }
    if (!token) {
      console.warn('[SeedBeginner] GITHUB_TOKEN is not set — skipping seed. Set it and run `npm run seed:beginner` to populate the catalogue.')
      return
    }
  }

  if (!token && !options.dryRun) {
    throw new Error('GITHUB_TOKEN is not set. Seed jobs run on the server token; add one to backend/.env (or use --dry-run).')
  }

  const selected = new Map<string, string>() // lowercased full name -> source
  if (options.curated) {
    for (const fullName of CURATED_REPOS) selected.set(fullName.toLowerCase(), 'curated')
  }

  if (options.search) {
    // Search API: 30 req/min authenticated, 10 unauthenticated.
    const delayMs = token ? 2_500 : 7_000
    for (const [i, language] of options.languages.entries()) {
      if (i > 0) await sleep(delayMs)
      try {
        const found = await searchLanguage(language, options, token)
        console.log(`[SeedBeginner] ${language}: ${found.length} found`)
        for (const fullName of found) {
          if (!selected.has(fullName.toLowerCase())) selected.set(fullName.toLowerCase(), `search:${language}`)
        }
      } catch (err) {
        console.error(`[SeedBeginner] ${(err as Error).message}`)
      }
    }
  }

  // Keep the original casing for curated entries; search results come back canonical.
  const canonical = new Map<string, string>()
  for (const fullName of CURATED_REPOS) canonical.set(fullName.toLowerCase(), fullName)

  const repos = [...selected.entries()].map(([key, source]) => ({ fullName: canonical.get(key) ?? key, source }))
  console.log(`[SeedBeginner] ${repos.length} repositories selected (${repos.filter((r) => r.source === 'curated').length} curated, ${repos.filter((r) => r.source !== 'curated').length} discovered)`)

  if (options.dryRun) {
    for (const repo of repos) console.log(`  ${repo.fullName}  (${repo.source})`)
    return
  }

  let queued = 0
  let alreadyQueued = 0
  let failed = 0
  for (const repo of repos) {
    try {
      const result = await JobEnqueueService.enqueueRepositoryAnalysis(`https://github.com/${repo.fullName}`)
      if (result.alreadyQueued) alreadyQueued++
      else queued++
    } catch (err) {
      failed++
      console.error(`[SeedBeginner] ${repo.fullName} — failed to enqueue:`, err)
    }
  }

  console.log(`[SeedBeginner] Done. ${queued} queued, ${alreadyQueued} already in flight, ${failed} failed. A running worker will analyze them and sync Neo4j.`)
}

main()
  .catch((err) => {
    console.error('[SeedBeginner] Fatal error:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeAllQueues().catch(() => {})
    await prisma.$disconnect()
  })
