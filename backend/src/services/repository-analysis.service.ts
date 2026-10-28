import { prisma } from '../utils/prisma'
import { AppError, GithubRateLimitError } from '../lib/errors'
import { isGithubTokenError } from './github-token-health.service'
import { Neo4jSyncService } from './neo4j-sync.service'
import {
  detectNpmFrameworks,
  detectPythonFrameworks,
  parsePackageJson,
  parseRawContent,
  getGithubTokenForJob,
  githubGetJson,
  githubPathExists,
  githubTryGetRaw,
  githubGraphQL,
  parseGithubRepoUrl,
  CI_CD_FILE_MAP,
  STACK_FILE_INDICATORS,
  type ProgressCallback,
  noopProgress
} from '../lib/github'
import { IGNORED_DIRS, IGNORED_FILES, GOOD_FIRST_ISSUE_LABELS, HELP_WANTED_LABELS } from '../lib/github/utils/constants'
import { extractKeywords } from '../lib/text/keywords'

// A rate limit or a rejected token says nothing about the repo: rethrown so the
// job waits or fails, instead of saving empty data in place of what's stored
const rethrowRateLimitOrToken = (err: unknown): void => {
  if (err instanceof GithubRateLimitError || isGithubTokenError(err)) throw err
}

// allSettled checks still have to stop on a rate limit or a rejected token
const rethrowSettled = (results: PromiseSettledResult<unknown>[]): void => {
  for (const result of results) if (result.status === 'rejected') rethrowRateLimitOrToken(result.reason)
}

// What the project is about, from its topics, description and README (one
// call); null when the README couldn't be read, so stored keywords are kept
const fetchKeywords = async (owner: string, repo: string, topics: string[], description: string | null, token: string): Promise<string[] | null> => {
  let readme: string | null
  try {
    readme = await githubTryGetRaw(`/repos/${owner}/${repo}/readme`, token)
  } catch (err) {
    rethrowRateLimitOrToken(err)
    console.error(`[RepoService] Failed to fetch README for ${owner}/${repo}:`, err)
    return null
  }
  return extractKeywords({ topics, description, readme })
}

interface RepoAnalysis {
  name: string
  owner: string
  fullName: string
  description: string | null
  url: string
  githubId: number
  // null when the fetch failed (the stored value is kept)
  languages: Record<string, number> | null
  frameworks: string[]
  techStack: string[]
  topics: string[] | null
  ciCd: string[]
  folderStructure: any
  dependencies: any
  stars: number
  forks: number
  openIssuesCount: number
  archived: boolean
  pushedAt: Date | null
}

interface GithubRepoResponse {
  id: number
  name: string
  owner: { login: string }
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  default_branch: string
  archived?: boolean
  pushed_at?: string | null
}

type Approachability = {
  goodFirstIssueCount: number
  helpWantedCount: number
  hasContributingGuide: boolean
  outsidePrMergeRate: number | null
  outsidePrsMerged90d: number | null
  maintainerResponseHours: number | null
  unclaimedStarterIssues: number | null
}

// People on the team; everyone else counts as an outside contributor
const TEAM = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])
const DAY_MS = 24 * 60 * 60 * 1000

type Author = { __typename?: string } | null
type SignalNodes = {
  closedPrs?: { nodes?: Array<{ authorAssociation: string; author?: Author; merged: boolean; closedAt: string | null }> }
  recentIssues?: { nodes?: Array<{ authorAssociation: string; author?: Author; createdAt: string; comments?: { nodes?: Array<{ authorAssociation: string; createdAt: string }> } }> }
  starters?: { nodes?: Array<{ assignees?: { totalCount: number }; closedByPullRequestsReferences?: { totalCount: number } }> }
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Whether newcomers actually succeed: merged outside PRs, maintainer replies to
// outsiders' issues, and starter issues still free to pick up
// Dependabot, Renovate and other bots aren't newcomers
const isBot = (author?: Author) => author?.__typename === 'Bot'
const UNANSWERED_CAP_HOURS = 14 * 24
// An unanswered issue younger than this says nothing yet about responsiveness
const UNANSWERED_MIN_AGE_HOURS = 3 * 24

const newcomerSignals = (repository: SignalNodes) => {
  const outsidePrs = (repository.closedPrs?.nodes ?? []).filter(pr => !TEAM.has(pr.authorAssociation) && !isBot(pr.author))
  const merged = outsidePrs.filter(pr => pr.merged)
  const since90d = Date.now() - 90 * DAY_MS

  const outsideIssues = (repository.recentIssues?.nodes ?? []).filter(issue => !TEAM.has(issue.authorAssociation) && !isBot(issue.author))
  // Hours until a maintainer replied; unanswered ones count as their age (capped
  // at two weeks), and very recent unanswered ones are left out
  const responseHours = outsideIssues.flatMap(issue => {
    const reply = (issue.comments?.nodes ?? []).find(c => TEAM.has(c.authorAssociation))
    if (reply) return [(Date.parse(reply.createdAt) - Date.parse(issue.createdAt)) / 3_600_000]
    const ageHours = (Date.now() - Date.parse(issue.createdAt)) / 3_600_000
    return ageHours < UNANSWERED_MIN_AGE_HOURS ? [] : [Math.min(ageHours, UNANSWERED_CAP_HOURS)]
  })
  // Fewer than 3 data points says little either way
  const starters = repository.starters?.nodes
  return {
    outsidePrMergeRate: outsidePrs.length >= 3 ? merged.length / outsidePrs.length : null,
    outsidePrsMerged90d: repository.closedPrs ? merged.filter(pr => pr.closedAt && Date.parse(pr.closedAt) >= since90d).length : null,
    maintainerResponseHours: responseHours.length >= 3 ? median(responseHours) : null,
    unclaimedStarterIssues: starters
      ? starters.filter(i => (i.assignees?.totalCount ?? 0) === 0 && (i.closedByPullRequestsReferences?.totalCount ?? 0) === 0).length
      : null
  }
}

const CONTRIBUTING_PATHS = ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md', 'CONTRIBUTING.rst', 'CONTRIBUTING']

// Signals are cheap (one GraphQL call) but change over time, so they're
// refreshed even for repos whose expensive structural analysis is cached.
const APPROACHABILITY_TTL_MS = 24 * 60 * 60 * 1000

const fetchApproachability = async (owner: string, repo: string, token: string): Promise<Approachability | null> => {
  const contributingFields = CONTRIBUTING_PATHS
    .map((path, i) => `c${i}: object(expression: ${JSON.stringify(`HEAD:${path}`)}) { id }`)
    .join('\n')
  const query = `
    query approachability($owner: String!, $repo: String!, $gfi: [String!], $hw: [String!]) {
      repository(owner: $owner, name: $repo) {
        goodFirst: issues(states: OPEN, labels: $gfi) { totalCount }
        helpWanted: issues(states: OPEN, labels: $hw) { totalCount }
        ${contributingFields}
        closedPrs: pullRequests(last: 50, states: [MERGED, CLOSED], orderBy: { field: UPDATED_AT, direction: ASC }) {
          nodes { authorAssociation author { __typename } merged closedAt }
        }
        recentIssues: issues(last: 20, orderBy: { field: CREATED_AT, direction: ASC }) {
          nodes { authorAssociation author { __typename } createdAt comments(first: 10) { nodes { authorAssociation createdAt } } }
        }
        starters: issues(first: 50, states: OPEN, labels: $gfi) {
          nodes { assignees { totalCount } closedByPullRequestsReferences(first: 1, includeClosedPrs: false) { totalCount } }
        }
      }
    }
  `
  try {
    const res = await githubGraphQL<{ data?: { repository?: Record<string, any> | null } }>(
      query, token, { owner, repo, gfi: GOOD_FIRST_ISSUE_LABELS, hw: HELP_WANTED_LABELS }
    )
    const repository = res.data?.repository
    if (!repository) return null
    return {
      goodFirstIssueCount: Number(repository.goodFirst?.totalCount) || 0,
      helpWantedCount: Number(repository.helpWanted?.totalCount) || 0,
      hasContributingGuide: CONTRIBUTING_PATHS.some((_path, i) => repository[`c${i}`] != null),
      ...newcomerSignals(repository as SignalNodes)
    }
  } catch (err) {
    rethrowRateLimitOrToken(err)
    console.error(`[RepoService] Approachability fetch failed for ${owner}/${repo}:`, err)
    return null
  }
}

interface GithubDependencyGraphResponse {
  data?: {
    repository?: {
      dependencyGraphManifests?: {
        nodes?: Array<{
          blobPath: string
          dependencies?: {
            nodes?: Array<{
              packageName: string
              requirements: string
              hasDependencies: boolean
              packageManager: string
            }>
          }
        }>
      }
    }
  }
}

interface GithubTreeResponse {
  sha: string
  url: string
  tree: Array<{
    path: string
    mode: string
    type: string
    sha: string
    size?: number
    url: string
  }>
  truncated: boolean
}

// CI_FILES replaced by CI_CD_FILE_MAP from constants

/**
 * Fetches the complete recursive file tree for a repository.
 *
 * Strategy:
 *   1. Try GET /git/trees/{branch}?recursive=1  (single request, fast path)
 *   2. If GitHub truncates it (>100k entries), fall back to:
 *      a. Fetch the root tree (non-recursive) to enumerate top-level dirs
 *      b. Fetch each top-level directory's subtree with ?recursive=1 in parallel
 *      c. Prefix nested entries with the parent dir path and merge
 *   3. If a subtree is also truncated, keep what we have and warn.
 */
const fetchFullTree = async (
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<GithubTreeResponse['tree']> => {
  const repoPath = `/repos/${owner}/${repo}`

  // ── Fast path ────────────────────────────────────────────────────────────
  let fullTree: GithubTreeResponse | null = null
  try {
    fullTree = await githubGetJson<GithubTreeResponse>(
      `${repoPath}/git/trees/${branch}?recursive=1`,
      token
    )
  } catch (err: any) {
    rethrowRateLimitOrToken(err)
    console.warn(`[RepoService] Recursive tree fetch failed for ${owner}/${repo} (${err?.message}), falling back to subtree fetching.`)
  }

  if (fullTree && !fullTree.truncated) {
    return fullTree.tree
  }

  // ── Truncated path ───────────────────────────────────────────────────────
  console.warn(
    `[RepoService] Tree truncated or fetch failed for ${owner}/${repo}. ` +
    `Fetching subtrees per top-level directory...`
  )

  // Step 1: Get root tree (non-recursive) — always fast
  const rootTree = await githubGetJson<GithubTreeResponse>(
    `${repoPath}/git/trees/${branch}`,
    token
  )

  const allEntries: GithubTreeResponse['tree'] = [...rootTree.tree]

  // Step 2: For every top-level directory, fetch its full subtree
  const topLevelDirs = rootTree.tree.filter(
    (node) => node.type === 'tree' && !IGNORED_DIRS.has(node.path)
  )

  const subtreeResults = await Promise.allSettled(
    topLevelDirs.map(async (dir) => {
      const sub = await githubGetJson<GithubTreeResponse>(
        `/repos/${owner}/${repo}/git/trees/${dir.sha}?recursive=1`,
        token
      )

      if (sub.truncated) {
        console.warn(
          `[RepoService] Subtree also truncated: ${dir.path}/ — keeping partial results.`
        )
      }

      // Prefix every nested entry with the parent directory path
      return sub.tree.map((node) => ({
        ...node,
        path: `${dir.path}/${node.path}`
      }))
    })
  )

  // A partial tree saved over a rate limit would look like a complete one
  rethrowSettled(subtreeResults)
  for (const result of subtreeResults) {
    if (result.status === 'fulfilled') {
      allEntries.push(...result.value)
    } else {
      console.warn(`[RepoService] Failed to fetch a subtree:`, result.reason)
    }
  }


  return allEntries
}

// GitHub says the repo is gone (deleted, made private, or taken down): hide it
// so it's neither recommended nor refreshed again, and drop it from the graph
const hideIfGone = async (repositoryId: string | undefined, err: unknown): Promise<void> => {
  if (!repositoryId || !(err instanceof AppError) || ![404, 451].includes(err.statusCode)) return
  await prisma.repository.update({ where: { id: repositoryId }, data: { hidden: true } }).catch(() => {})
  await Neo4jSyncService.removeRepository(repositoryId).catch((error) => {
    console.error(`[RepoService] Failed to remove repository ${repositoryId} from Neo4j:`, error)
  })
  console.warn(`[RepoService] Repository ${repositoryId} is gone on GitHub (HTTP ${err.statusCode}); hidden`)
}

const analyzeRepository = async (
  url: string,
  userId: string | undefined,
  onProgress: ProgressCallback = noopProgress,
  force: boolean = false
) => {
  await onProgress(5, 'Validating repository URL...')
  const { owner, repo } = parseGithubRepoUrl(url)
  const fullName = `${owner}/${repo}`

  // Check if repository already exists and has folderStructure
  const existingRepo = await prisma.repository.findUnique({
    where: {
      provider_fullName: {
        provider: 'github',
        fullName: fullName
      }
    }
  })

  await onProgress(8, 'Fetching credentials...')
  const accessToken = await getGithubTokenForJob(userId)

  // If we already have the folderStructure and force isn't true, skip the
  // structural analysis — but keep the approachability signals fresh.
  if (existingRepo && existingRepo.folderStructure && !force) {
    const age = existingRepo.approachabilityUpdatedAt
      ? Date.now() - existingRepo.approachabilityUpdatedAt.getTime()
      : Infinity
    if (age < APPROACHABILITY_TTL_MS) {
      await onProgress(100, 'Repository already analyzed.')
      return existingRepo
    }

    await onProgress(50, 'Refreshing contributor-friendliness signals...')
    const [meta, approachability, keywords] = await Promise.all([
      githubGetJson<GithubRepoResponse>(`/repos/${owner}/${repo}`, accessToken),
      fetchApproachability(owner, repo, accessToken),
      // Keywords rarely change: only fetched for repos that don't have them yet
      existingRepo.keywords.length === 0
        ? fetchKeywords(owner, repo, existingRepo.topics, existingRepo.description, accessToken)
        : Promise.resolve(null)
    ]).catch(async (err) => {
      await hideIfGone(existingRepo.id, err)
      throw err
    })
    const refreshed = await prisma.repository.update({
      where: { id: existingRepo.id },
      data: {
        stars: Number(meta.stargazers_count) || 0,
        forks: Number(meta.forks_count) || 0,
        openIssuesCount: Number(meta.open_issues_count) || 0,
        archived: !!meta.archived,
        pushedAt: meta.pushed_at ? new Date(meta.pushed_at) : null,
        // Bumped even when the signals couldn't be read, so the nightly refresh
        // (oldest first) moves on instead of retrying this repo forever
        ...approachability,
        approachabilityUpdatedAt: new Date(),
        ...(keywords && { keywords })
      }
    })
    await onProgress(100, 'Repository already analyzed; signals refreshed.')
    return refreshed
  }

  const analysis = await analyzeGithubRepo(owner, repo, accessToken, onProgress).catch(async (err) => {
    await hideIfGone(existingRepo?.id, err)
    throw err
  })
  await onProgress(78, 'Checking contributor-friendliness...')
  const [approachability, keywords] = await Promise.all([
    fetchApproachability(owner, repo, accessToken),
    fetchKeywords(owner, repo, analysis.topics ?? existingRepo?.topics ?? [], analysis.description, accessToken)
  ])
  await onProgress(80, 'Saving repository data...')

  // Only persist folderStructure and dependencies if they are actually populated
  // to prevent a failed analysis from locking out future re-analysis attempts
  const persistFolderStructure = Array.isArray(analysis.folderStructure) && analysis.folderStructure.length > 0
    ? analysis.folderStructure
    : undefined
  const persistDependencies = Array.isArray(analysis.dependencies) && analysis.dependencies.length > 0
    ? analysis.dependencies
    : undefined

  const repoData = {
    name: analysis.name,
    owner: analysis.owner,
    fullName: analysis.fullName,
    description: analysis.description,
    url: analysis.url,
    provider: 'github',
    githubId: analysis.githubId,
    // A failed fetch keeps what's stored rather than saving it as empty
    ...(analysis.languages && {
      languages: analysis.languages,
      primaryLanguage: Object.entries(analysis.languages).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
    }),
    frameworks: analysis.frameworks,
    techStack: analysis.techStack,
    ...(analysis.topics && { topics: analysis.topics }),
    ...(keywords && { keywords }),
    ciCd: analysis.ciCd,
    stars: analysis.stars,
    forks: analysis.forks,
    openIssuesCount: analysis.openIssuesCount,
    archived: analysis.archived,
    pushedAt: analysis.pushedAt,
    // Bumped even without signals, as in the refresh above
    ...approachability,
    approachabilityUpdatedAt: new Date(),
    ...(persistFolderStructure !== undefined && { folderStructure: persistFolderStructure }),
    ...(persistDependencies !== undefined && { dependencies: persistDependencies })
  }

  // 1. Try to find by githubId (best identifier, handles repo renames)
  let targetRepo = await prisma.repository.findUnique({
    where: { githubId: analysis.githubId }
  })

  // 2. Fallback to provider_fullName in case githubId is missing
  if (!targetRepo) {
    targetRepo = await prisma.repository.findUnique({
      where: { 
        provider_fullName: {
          provider: 'github',
          fullName: analysis.fullName
        }
      }
    })
  }

  let saved
  if (targetRepo) {
    saved = await prisma.repository.update({
      where: { id: targetRepo.id },
      data: repoData
    })
  } else {
    saved = await prisma.repository.create({
      data: repoData
    })
  }

  await onProgress(100, 'Repository analysis complete!')

  return saved
}

const analyzeGithubRepo = async (
  owner: string,
  repo: string,
  token: string,
  onProgress: ProgressCallback = noopProgress
): Promise<RepoAnalysis> => {
  const repoPath = `/repos/${owner}/${repo}`

  await onProgress(10, `Fetching metadata for ${owner}/${repo}...`)
  const repoData = await githubGetJson<GithubRepoResponse>(repoPath, token)

  await onProgress(18, 'Detecting languages...')
  let languagesData: Record<string, number> | null = null
  try {
    languagesData = await githubGetJson<Record<string, number>>(`${repoPath}/languages`, token)
  } catch (err) {
    rethrowRateLimitOrToken(err)
    console.error(`[RepoService] Failed to fetch languages for ${owner}/${repo}:`, err)
  }

  let topics: string[] | null = null
  try {
    const topicsRes = await githubGetJson<{ names: string[] }>(`${repoPath}/topics`, token)
    topics = topicsRes.names || []
  } catch (err) {
    rethrowRateLimitOrToken(err)
    console.error(`[RepoService] Failed to fetch topics for ${owner}/${repo}:`, err)
  }

  await onProgress(25, 'Fetching repository file tree for visual map...')
  let folderStructure: any = null
  try {
    const branch = repoData.default_branch || 'main'
    const rawTree = await fetchFullTree(owner, repo, branch, token)

    if (rawTree.length > 0) {
      folderStructure = rawTree.filter((node) => {
        const parts = node.path.split('/')
        if (parts.some((part) => IGNORED_DIRS.has(part))) return false
        const filename = parts[parts.length - 1]
        if (IGNORED_FILES.has(filename)) return false
        return true
      })
    }
  } catch (err) {
    rethrowRateLimitOrToken(err)
    console.error(`[RepoService] Tree fetch error:`, err)
  }

  await onProgress(40, 'Detecting frameworks and tech stack...')
  const frameworks = new Set<string>()
  const techStack = new Set<string>()
  const fallbackDependencies: any[] = []

  // Build a set of known paths for fast lookup
  const knownPaths = new Set<string>(folderStructure ? folderStructure.map((n: any) => n.path) : [])

  if (folderStructure) {
    // Node.js / package.json
    const packageJsonPaths = folderStructure.filter((n: any) => n.path.endsWith('package.json') && n.path.split('/').length <= 3).map((n: any) => n.path)
    if (packageJsonPaths.length === 0) packageJsonPaths.push('package.json')
    for (const path of packageJsonPaths) {
      const nodeDeps = await detectNodeStack(owner, repo, path, token, frameworks, techStack)
      if (nodeDeps) fallbackDependencies.push(nodeDeps)
    }

    // Python: requirements.txt, pyproject.toml, setup.py
    const pyPaths = folderStructure
      .filter((n: any) => (n.path.endsWith('requirements.txt') || n.path.endsWith('pyproject.toml') || n.path.endsWith('setup.py')) && n.path.split('/').length <= 3)
      .map((n: any) => n.path)
    if (pyPaths.length === 0) pyPaths.push('requirements.txt')
    for (const path of pyPaths) {
      const pyDeps = await detectPythonStack(owner, repo, path, token, frameworks, techStack)
      if (pyDeps) fallbackDependencies.push(pyDeps)
    }

    // Detect stacks from file/dir indicators using the folder tree
    for (const indicator of STACK_FILE_INDICATORS) {
      if (knownPaths.has(indicator.path)) {
        techStack.add(indicator.tech)
        if (indicator.framework) frameworks.add(indicator.framework)
      }
    }
  } else {
    // Fallback: try common files directly via API
    const nodeDeps = await detectNodeStack(owner, repo, 'package.json', token, frameworks, techStack)
    if (nodeDeps) fallbackDependencies.push(nodeDeps)

    const pyDeps = await detectPythonStack(owner, repo, 'requirements.txt', token, frameworks, techStack)
    if (pyDeps) fallbackDependencies.push(pyDeps)

    // Fallback stack detection via API for non-JS/Py stacks
    await detectStacksViaApi(owner, repo, token, frameworks, techStack)
  }

  await onProgress(50, 'Detecting CI/CD pipelines...')
  const ciCd = await detectCiCdPipelines(owner, repo, token, Array.isArray(folderStructure) ? folderStructure : null)

  await onProgress(60, 'Fetching deep dependency graph...')
  let dependenciesData: any[] = []
  try {
    const query = `
      query getRepoDependencies($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          dependencyGraphManifests {
            nodes {
              blobPath
              dependencies {
                nodes {
                  packageName
                  requirements
                  hasDependencies
                  packageManager
                }
              }
            }
          }
        }
      }
    `
    const depRes = await githubGraphQL<GithubDependencyGraphResponse>(query, token, { owner, repo })
    dependenciesData = depRes.data?.repository?.dependencyGraphManifests?.nodes || []
    
    // Auto-detect frameworks from deep dependencies if missed by root scan
    dependenciesData.forEach((manifest: any) => {
      manifest.dependencies?.nodes?.forEach((dep: any) => {
        const pkg = dep.packageName.toLowerCase()
        // Exact names: substring matching tagged preact/@testing-library/react as React
        if (pkg === 'react' || pkg === 'react-dom') frameworks.add('React')
        if (pkg === 'next') frameworks.add('Next.js')
        if (pkg === 'vue') frameworks.add('Vue')
        if (pkg === 'django') frameworks.add('Django')
      })
    })
  } catch (err) {
    rethrowRateLimitOrToken(err)
    console.error(`[RepoService] Dependency graph error:`, err)
  }

  if (dependenciesData.length === 0) {
    dependenciesData = fallbackDependencies
  }

  await onProgress(75, 'Repository tech stack analysis complete')

  return {
    name: String(repoData.name),
    owner: String(repoData.owner.login),
    fullName: `${owner}/${repo}`,
    description: repoData.description,
    url: String(repoData.html_url),
    githubId: Number(repoData.id),
    languages: languagesData,
    frameworks: Array.from(frameworks),
    techStack: Array.from(techStack),
    topics,
    ciCd,
    folderStructure,
    dependencies: dependenciesData,
    stars: Number(repoData.stargazers_count) || 0,
    forks: Number(repoData.forks_count) || 0,
    openIssuesCount: Number(repoData.open_issues_count) || 0,
    archived: !!repoData.archived,
    pushedAt: repoData.pushed_at ? new Date(repoData.pushed_at) : null
  }
}

const detectNodeStack = async (
  owner: string,
  repo: string,
  filePath: string,
  token: string,
  frameworks: Set<string>,
  techStack: Set<string>
): Promise<any | null> => {
  const raw = await githubTryGetRaw(`/repos/${owner}/${repo}/contents/${filePath}`, token)
  if (raw === null) return null

  try {
    const pkgJson = parsePackageJson(raw)
    detectNpmFrameworks(pkgJson, frameworks)
    techStack.add('Node.js')

    const nodes = []
    const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
    for (const [name, req] of Object.entries(allDeps)) {
      if (typeof req === 'string') {
        nodes.push({ packageName: name, requirements: req, packageManager: 'NPM', hasDependencies: false })
      }
    }

    return {
      blobPath: filePath,
      dependencies: { nodes }
    }
  } catch (err) {
    return null
  }
}

const detectPythonStack = async (
  owner: string,
  repo: string,
  filePath: string,
  token: string,
  frameworks: Set<string>,
  techStack: Set<string>
): Promise<any | null> => {
  const raw = await githubTryGetRaw(`/repos/${owner}/${repo}/contents/${filePath}`, token)
  if (raw === null) return null

  try {
    const content = parseRawContent(raw)
    detectPythonFrameworks(content, frameworks)
    techStack.add('Python')

    const nodes = []
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const parts = trimmed.split(/[=<>!~]/)
      const name = parts[0].trim()
      const req = trimmed.substring(name.length).trim() || '*'
      if (name) {
        nodes.push({ packageName: name, requirements: req, packageManager: 'PIP', hasDependencies: false })
      }
    }

    return {
      blobPath: filePath,
      dependencies: { nodes }
    }
  } catch (err) {
    return null
  }
}

// Fallback: check file indicators via GitHub API when no folder tree is available
const detectStacksViaApi = async (
  owner: string,
  repo: string,
  token: string,
  frameworks: Set<string>,
  techStack: Set<string>
): Promise<void> => {
  const repoBase = `/repos/${owner}/${repo}/contents`

  const checks = await Promise.allSettled(
    STACK_FILE_INDICATORS.map(async (indicator) => {
      const exists = await githubPathExists(`${repoBase}/${indicator.path}`, token)
      if (exists) {
        techStack.add(indicator.tech)
        if (indicator.framework) frameworks.add(indicator.framework)

        // Extra: detect Spring in pom.xml
        if (indicator.path === 'pom.xml') {
          const content = await githubTryGetRaw(`${repoBase}/pom.xml`, token)
          if (content?.toLowerCase().includes('spring')) {
            frameworks.add('Spring')
          }
        }
      }
    })
  )

  // Log any failures (non-critical)
  rethrowSettled(checks)
  checks.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`[RepoService] Stack detection check failed for ${STACK_FILE_INDICATORS[i].path}:`, result.reason)
    }
  })
}

const detectCiCdPipelines = async (
  owner: string,
  repo: string,
  token: string,
  folderStructure: any[] | null = null
): Promise<string[]> => {
  const seen = new Set<string>()
  const pipelines: string[] = []

  // Fast path: if we have the folder tree, use it instead of making API calls
  if (folderStructure && folderStructure.length > 0) {
    const knownPaths = new Set(folderStructure.map((n: any) => n.path))
    for (const file of CI_CD_FILE_MAP) {
      // For directories like .github/workflows, check if any file starts with that path
      const exists = knownPaths.has(file.path) || folderStructure.some((n: any) => n.path.startsWith(file.path + '/'))
      if (exists && !seen.has(file.name)) {
        seen.add(file.name)
        pipelines.push(file.name)
      }
    }
    return pipelines
  }

  // Slow path: check via API
  const results = await Promise.allSettled(
    CI_CD_FILE_MAP.map(async (file) => {
      const exists = await githubPathExists(`/repos/${owner}/${repo}/contents/${file.path}`, token)
      return exists ? file.name : null
    })
  )

  rethrowSettled(results)
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null && !seen.has(result.value)) {
      seen.add(result.value)
      pipelines.push(result.value)
    }
  }

  return pipelines
}

export const RepositoryAnalysisService = {
  analyzeRepository
}
