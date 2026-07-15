import { prisma } from '../utils/prisma'
import { AppError } from '../lib/errors'
import {
  detectNpmFrameworks,
  detectPythonFrameworks,
  parsePackageJson,
  parseRawContent,
  getGithubAccessToken,
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
import { IGNORED_DIRS, IGNORED_FILES } from '../lib/github/utils/constants'

interface RepoAnalysis {
  name: string
  owner: string
  fullName: string
  description: string | null
  url: string
  githubId: number
  languages: Record<string, number>
  frameworks: string[]
  techStack: string[]
  topics: string[]
  ciCd: string[]
  folderStructure: any
  dependencies: any
  stars: number
  forks: number
  openIssuesCount: number
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

  for (const result of subtreeResults) {
    if (result.status === 'fulfilled') {
      allEntries.push(...result.value)
    } else {
      console.warn(`[RepoService] Failed to fetch a subtree:`, result.reason)
    }
  }


  return allEntries
}

const analyzeRepository = async (
  url: string,
  userId: string,
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

  // If we already have the folderStructure and force isn't true, skip analysis
  if (existingRepo && existingRepo.folderStructure && !force) {

    await onProgress(100, 'Repository already analyzed.')
    return existingRepo
  }

  await onProgress(8, 'Fetching user credentials...')
  const accessToken = await getGithubAccessToken(userId)
  const analysis = await analyzeGithubRepo(owner, repo, accessToken, onProgress)
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
    languages: analysis.languages,
    frameworks: analysis.frameworks,
    techStack: analysis.techStack,
    topics: analysis.topics,
    ciCd: analysis.ciCd,
    stars: analysis.stars,
    forks: analysis.forks,
    openIssuesCount: analysis.openIssuesCount,
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
  let languagesData: Record<string, number> = {}
  try {
    languagesData = await githubGetJson<Record<string, number>>(`${repoPath}/languages`, token)
  } catch (err) {
    console.error(`[RepoService] Failed to fetch languages for ${owner}/${repo}:`, err)
    languagesData = {}
  }

  let topics: string[] = []
  try {
    const topicsRes = await githubGetJson<{ names: string[] }>(`${repoPath}/topics`, token)
    topics = topicsRes.names || []
  } catch (err) {
    console.error(`[RepoService] Failed to fetch topics for ${owner}/${repo}:`, err)
    topics = []
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
        if (pkg.includes('react')) frameworks.add('React')
        if (pkg === 'next') frameworks.add('Next.js')
        if (pkg === 'vue') frameworks.add('Vue')
        if (pkg.includes('django')) frameworks.add('Django')
      })
    })
  } catch (err) {
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
    openIssuesCount: Number(repoData.open_issues_count) || 0
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
