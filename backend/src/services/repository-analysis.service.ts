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
  type ProgressCallback,
  noopProgress
} from '../lib/github'

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
  ciCd: string[]
  folderStructure: any
  dependencies: any
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

const CI_FILES = [
  { path: '.github/workflows', name: 'github-actions' },
  { path: 'Jenkinsfile', name: 'jenkins' },
  { path: '.circleci/config.yml', name: 'circleci' },
  { path: '.travis.yml', name: 'travis-ci' },
  { path: 'Dockerfile', name: 'docker' },
  { path: 'docker-compose.yml', name: 'docker-compose' },
  { path: 'docker-compose.yaml', name: 'docker-compose' }
] as const

const analyzeRepository = async (
  url: string,
  userId: string,
  onProgress: ProgressCallback = noopProgress
) => {
  console.log(`[RepoService] Starting analysis for ${url}`)
  await onProgress(5, 'Validating repository URL...')
  const { owner, repo } = parseGithubRepoUrl(url)
  const fullName = `${owner}/${repo}`
  console.log(`[RepoService] Parsed URL: owner=${owner}, repo=${repo}`)

  // Check if repository already exists and has folderStructure
  const existingRepo = await prisma.repository.findUnique({
    where: {
      provider_fullName: {
        provider: 'github',
        fullName: fullName
      }
    }
  })

  if (existingRepo && existingRepo.folderStructure && Object.keys(existingRepo.folderStructure).length > 0) {
    console.log(`[RepoService] Repository ${fullName} already fully analyzed. Skipping.`)
    await onProgress(100, 'Repository already analyzed.')
    return existingRepo
  }

  await onProgress(8, 'Fetching user credentials...')
  const accessToken = await getGithubAccessToken(userId)
  console.log(`[RepoService] Retrieved GitHub token for user ${userId}`)

  console.log(`[RepoService] Fetching repository data from GitHub API...`)
  const analysis = await analyzeGithubRepo(owner, repo, accessToken, onProgress)
  console.log(`[RepoService] GitHub API analysis complete for ${analysis.fullName}`)

  await onProgress(80, 'Saving repository data...')
  console.log(`[RepoService] Saving repository ${analysis.fullName} to database...`)

  const saved = await prisma.repository.upsert({
    where: { 
      provider_fullName: {
        provider: 'github',
        fullName: analysis.fullName
      }
    },
    update: {
      name: analysis.name,
      owner: analysis.owner,
      description: analysis.description,
      url: analysis.url,
      provider: 'github',
      githubId: analysis.githubId,
      languages: analysis.languages,
      frameworks: analysis.frameworks,
      techStack: analysis.techStack,
      ciCd: analysis.ciCd,
      folderStructure: analysis.folderStructure,
      dependencies: analysis.dependencies
    },
    create: {
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
      ciCd: analysis.ciCd,
      folderStructure: analysis.folderStructure,
      dependencies: analysis.dependencies
    }
  })

  await onProgress(100, 'Repository analysis complete!')
  console.log(`[RepoService] Repository ${saved.fullName} successfully saved to database.`)
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
  } catch {
    languagesData = {}
  }

  await onProgress(25, 'Fetching repository file tree for visual map...')
  let folderStructure: any = null
  let isShallow = false
  try {
    const branch = repoData.default_branch || 'main'
    let treeRes: GithubTreeResponse
    
    try {
      treeRes = await githubGetJson<GithubTreeResponse>(`${repoPath}/git/trees/${branch}?recursive=1`, token)
    } catch (err: any) {
      console.warn(`[RepoService] Recursive tree fetch failed for ${owner}/${repo}, falling back to shallow fetch.`)
      treeRes = await githubGetJson<GithubTreeResponse>(`${repoPath}/git/trees/${branch}`, token)
      isShallow = true
    }
    
    const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'out', 'vendor', '.cache', '.github', '.vscode', '.idea', 'target', 'bin', 'obj'])
    const IGNORED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '.DS_Store', 'Thumbs.db'])

    folderStructure = treeRes.tree.filter(node => {
      const parts = node.path.split('/')
      if (parts.some(part => IGNORED_DIRS.has(part))) return false
      const filename = parts[parts.length - 1]
      if (IGNORED_FILES.has(filename)) return false
      return true
    })
  } catch (err) {
    console.error(`[RepoService] Tree fetch error (both recursive and shallow failed):`, err)
  }

  await onProgress(40, 'Detecting frameworks and tech stack...')
  const frameworks = new Set<string>()
  const techStack = new Set<string>()
  const fallbackDependencies: any[] = []

  if (folderStructure) {
    const packageJsonPaths = folderStructure.filter((n: any) => n.path.endsWith('package.json') && n.path.split('/').length <= 3).map((n: any) => n.path)
    if (packageJsonPaths.length === 0) packageJsonPaths.push('package.json')
    for (const path of packageJsonPaths) {
      const nodeDeps = await detectNodeStack(owner, repo, path, token, frameworks, techStack)
      if (nodeDeps) fallbackDependencies.push(nodeDeps)
    }

    const reqPaths = folderStructure.filter((n: any) => n.path.endsWith('requirements.txt') && n.path.split('/').length <= 3).map((n: any) => n.path)
    if (reqPaths.length === 0) reqPaths.push('requirements.txt')
    for (const path of reqPaths) {
      const pyDeps = await detectPythonStack(owner, repo, path, token, frameworks, techStack)
      if (pyDeps) fallbackDependencies.push(pyDeps)
    }
  } else {
    const nodeDeps = await detectNodeStack(owner, repo, 'package.json', token, frameworks, techStack)
    if (nodeDeps) fallbackDependencies.push(nodeDeps)

    const pyDeps = await detectPythonStack(owner, repo, 'requirements.txt', token, frameworks, techStack)
    if (pyDeps) fallbackDependencies.push(pyDeps)
  }

  await detectOtherStacks(owner, repo, token, frameworks, techStack)

  await onProgress(50, 'Detecting CI/CD pipelines...')
  const ciCd = await detectCiCdPipelines(owner, repo, token)

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
    const depRes = await githubGraphQL<GithubDependencyGraphResponse>(query, token, { owner, repo }, 'application/vnd.github.hawkgirl-preview+json')
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

  if (isShallow && folderStructure && dependenciesData.length > 0) {
    const existingPaths = new Set(folderStructure.map((n: any) => n.path));
    dependenciesData.forEach((manifest: any) => {
      let manifestPath = manifest.blobPath;
      if (manifestPath.startsWith('/')) manifestPath = manifestPath.substring(1);
      
      const parts = manifestPath.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        currentPath = i === 0 ? parts[i] : `${currentPath}/${parts[i]}`;
        if (!existingPaths.has(currentPath)) {
          existingPaths.add(currentPath);
          folderStructure.push({
            path: currentPath,
            mode: '100644',
            type: i === parts.length - 1 ? 'blob' : 'tree',
            sha: 'dummy-sha-' + currentPath,
            size: 100,
            url: ''
          });
        }
      }
    });
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
    ciCd,
    folderStructure,
    dependencies: dependenciesData
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

const detectOtherStacks = async (
  owner: string,
  repo: string,
  token: string,
  frameworks: Set<string>,
  techStack: Set<string>
): Promise<void> => {
  const repoBase = `/repos/${owner}/${repo}/contents`

  if (await githubPathExists(`${repoBase}/go.mod`, token)) {
    techStack.add('Go')
  }

  const pomXml = await githubTryGetRaw(`${repoBase}/pom.xml`, token)
  if (pomXml !== null) {
    techStack.add('Java/Maven')
    if (pomXml.includes('spring')) {
      frameworks.add('Spring')
    }
  }
}

const detectCiCdPipelines = async (
  owner: string,
  repo: string,
  token: string
): Promise<string[]> => {
  const results = await Promise.all(
    CI_FILES.map(async (file) => {
      const exists = await githubPathExists(`/repos/${owner}/${repo}/contents/${file.path}`, token)
      return exists ? file.name : null
    })
  )

  const pipelines: string[] = []
  for (const name of results) {
    if (name !== null) {
      pipelines.push(name)
    }
  }
  return pipelines
}

export const RepositoryAnalysisService = {
  analyzeRepository
}
