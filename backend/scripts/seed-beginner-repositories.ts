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
 *   --per-language=N              Top-starred search results per language (default 50, max 100)
 *   --active-per-language=N       Extra recently-updated results per language (default 25, 0 to skip)
 *   --min-good-first-issues=N     Search threshold for open good first issues (default 5)
 *   --pushed-within-days=N        Only repos pushed within N days (default 90)
 *   --languages=a,b,c             Override the language list for search
 *   --topics=a,b,c                Override the framework/topic list for search
 *   --per-topic=N                 Top-starred search results per topic (default 30, max 100)
 *   --no-curated                  Skip the curated list
 *   --no-search                   Skip GitHub search discovery
 *   --include-existing            Re-analyze repositories already in the catalogue
 *                                 (skipped by default to save the token's API budget)
 *   --if-empty                    Fresh-database mode: seed only when no repositories
 *                                 exist yet, and skip (exit 0) when GITHUB_TOKEN is unset
 */
import { config } from '../src/config'
import { prisma } from '../src/utils/prisma'
import { JobEnqueueService } from '../src/services/job-enqueue.service'
import { closeAllQueues, getQueue, QUEUE_NAMES } from '../src/config/queue'
import { DEFAULT_LANGUAGES, DEFAULT_TOPICS, discoverRepositories } from '../src/services/catalogue-discovery.service'

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
  'tldr-pages/tldr',
  'exercism/go',
  'exercism/rust',
  'TheAlgorithms/C-Sharp',
  'TheAlgorithms/TypeScript',

  // JavaScript / TypeScript
  'processing/p5.js',
  'excalidraw/excalidraw',
  'withastro/astro',
  'vitejs/vite',
  'hoppscotch/hoppscotch',
  'appwrite/appwrite',
  'calcom/cal.com',
  'nodejs/node',
  'tldraw/tldraw',
  'documenso/documenso',
  'twentyhq/twenty',
  'formbricks/formbricks',
  'novuhq/novu',
  'nocodb/nocodb',
  'n8n-io/n8n',
  'directus/directus',
  'strapi/strapi',
  'medusajs/medusa',
  'ueberdosis/tiptap',
  'react-hook-form/react-hook-form',
  'date-fns/date-fns',
  'eslint/eslint',
  'prettier/prettier',
  'jestjs/jest',
  'storybookjs/storybook',
  'mermaid-js/mermaid',
  'chartjs/Chart.js',
  'mattermost/mattermost',
  'RocketChat/Rocket.Chat',
  'jitsi/jitsi-meet',
  'supabase/supabase',
  'immich-app/immich',
  'bitwarden/clients',
  'WordPress/gutenberg',
  'vuejs/core',
  'sveltejs/svelte',
  'nuxt/nuxt',

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
  'fastapi/fastapi',
  'pydantic/pydantic',
  'encode/httpx',
  'psf/black',
  'pytest-dev/pytest',
  'networkx/networkx',
  'scipy/scipy',
  'numpy/numpy',
  'streamlit/streamlit',
  'gradio-app/gradio',
  'apache/airflow',
  'apache/superset',
  'internetarchive/openlibrary',
  'projectmesa/mesa',
  'mne-tools/mne-python',
  'qutip/qutip',
  'OWASP/Nettacker',

  // Go
  'cli/cli',
  'jesseduffield/lazygit',
  'charmbracelet/bubbletea',
  'spf13/cobra',
  'gohugoio/hugo',
  'kubernetes/website',
  'go-gitea/gitea',
  'prometheus/prometheus',
  'grafana/k6',
  'traefik/traefik',
  'caddyserver/caddy',
  'golangci/golangci-lint',
  'charmbracelet/glow',
  'charmbracelet/gum',
  'junegunn/fzf',
  'derailed/k9s',
  'open-telemetry/opentelemetry-go',
  'kubernetes/minikube',
  'helm/helm',
  'kubernetes-sigs/kind',

  // Rust
  'nushell/nushell',
  'uutils/coreutils',
  'astral-sh/ruff',
  'rust-lang/rust-clippy',
  'servo/servo',
  'tauri-apps/tauri',
  'bevyengine/bevy',
  'helix-editor/helix',
  'starship/starship',
  'sharkdp/bat',
  'sharkdp/fd',
  'denoland/deno',
  'biomejs/biome',
  'rust-lang/rust-analyzer',
  'tokio-rs/tokio',
  'ratatui/ratatui',
  'eza-community/eza',
  'alacritty/alacritty',

  // Ruby
  'rubyforgood/human-essentials',
  'rubyforgood/casa',
  'publiclab/plots2',
  'mastodon/mastodon',
  'discourse/discourse',
  'forem/forem',
  'rubocop/rubocop',
  'jekyll/jekyll',
  'Homebrew/brew',
  'opf/openproject',

  // Java / Kotlin / Android
  'JabRef/jabref',
  'ankidroid/Anki-Android',
  'thunderbird/thunderbird-android',
  'checkstyle/checkstyle',
  'zaproxy/zaproxy',
  'TeamNewPipe/NewPipe',
  'AntennaPod/AntennaPod',
  'wordpress-mobile/WordPress-Android',
  'detekt/detekt',
  'pinterest/ktlint',
  'oss-review-toolkit/ort',

  // C# / .NET
  'files-community/Files',
  'ShareX/ShareX',
  'microsoft/PowerToys',
  'PowerShell/PowerShell',
  'jellyfin/jellyfin',
  'AvaloniaUI/Avalonia',
  'ppy/osu',
  'Radarr/Radarr',
  'Sonarr/Sonarr',
  'MaterialDesignInXAML/MaterialDesignInXamlToolkit',

  // Dart / Flutter
  'openfoodfacts/smooth-app',

  // React Native / mobile
  'expo/expo',
  'infinitered/ignite',
  'software-mansion/react-native-reanimated',
  'callstack/react-native-paper',
  'react-navigation/react-navigation',
  'bluesky-social/social-app',
  'mattermost/mattermost-mobile',
  'rainbow-me/rainbow',
  'AppFlowy-IO/AppFlowy',
  'localsend/localsend',
  'fluttercommunity/plus_plugins',

  // C / C++
  'godotengine/godot',
  'organicmaps/organicmaps',
  'FreeCAD/FreeCAD',
  'musescore/MuseScore',
  'mixxxdj/mixxx',
  'obsproject/obs-studio',
  'OpenRCT2/OpenRCT2',
  'duckdb/duckdb',
  'neovim/neovim',

  // Swift
  'realm/SwiftLint',
  'nicklockwood/SwiftFormat',
  'wordpress-mobile/WordPress-iOS',
  'kickstarter/ios-oss',

  // PHP
  'nextcloud/server',
  'matomo-org/matomo',
  'phpmyadmin/phpmyadmin',
  'mautic/mautic',
  'filamentphp/filament',
  'PrestaShop/PrestaShop',
  'joomla/joomla-cms',

  // Elixir
  'phoenixframework/phoenix',
  'plausible/analytics',
  'livebook-dev/livebook',
  'hexpm/hexpm',

  // Shell / dotfiles
  'ohmyzsh/ohmyzsh',
  'nvm-sh/nvm',

  // Data / science
  'JuliaLang/julia',
  'quarto-dev/quarto-cli',

  // Infra / cloud native
  'meshery/meshery',
  'keploy/keploy'
]

type Options = {
  dryRun: boolean
  ifEmpty: boolean
  perLanguage: number
  activePerLanguage: number
  includeExisting: boolean
  minGoodFirstIssues: number
  pushedWithinDays: number
  languages: string[]
  topics: string[]
  perTopic: number
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
    perLanguage: int('per-language', 50, 100),
    activePerLanguage: value('active-per-language') === '0' ? 0 : int('active-per-language', 25, 100),
    includeExisting: argv.includes('--include-existing'),
    minGoodFirstIssues: int('min-good-first-issues', 5),
    pushedWithinDays: int('pushed-within-days', 90),
    languages: value('languages')?.split(',').map((l) => l.trim()).filter(Boolean) ?? DEFAULT_LANGUAGES,
    topics: value('topics')?.split(',').map((t) => t.trim()).filter(Boolean) ?? DEFAULT_TOPICS,
    perTopic: int('per-topic', 30, 100),
    curated: !argv.includes('--no-curated'),
    search: !argv.includes('--no-search')
  }
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
    const found = await discoverRepositories(options, token, (label, added) => console.log(`[SeedBeginner] ${label}: ${added} new`))
    for (const [key, source] of found) if (!selected.has(key)) selected.set(key, source)
  }

  // Keep the original casing for curated entries; search results come back canonical.
  const canonical = new Map<string, string>()
  for (const fullName of CURATED_REPOS) canonical.set(fullName.toLowerCase(), fullName)

  let repos = [...selected.entries()].map(([key, source]) => ({ fullName: canonical.get(key) ?? key, source }))

  // Each analysis costs dozens of API calls on the server token, so repos already
  // in the catalogue are skipped unless asked (they re-sync on their own schedule).
  if (!options.includeExisting) {
    try {
      const existing = new Set(
        (await prisma.repository.findMany({ select: { fullName: true } })).map((r) => r.fullName.toLowerCase())
      )
      const before = repos.length
      repos = repos.filter((r) => !existing.has(r.fullName.toLowerCase()))
      if (before !== repos.length) console.log(`[SeedBeginner] ${before - repos.length} already in the catalogue — skipped (use --include-existing to re-analyze)`)
    } catch (err) {
      // Only a dry run gets here without a database; a real run fails at enqueue anyway
      console.warn(`[SeedBeginner] Couldn't read the catalogue, so nothing is skipped: ${(err as Error).message.split('\n')[0]}`)
    }
  }
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
