import { prisma } from '../utils/prisma'
import { AppError } from '../lib/errors'
import {
  detectNpmFrameworks,
  detectPythonFrameworks,
  parsePackageJson,
  parseRawContent
} from '../lib/github/detect-frameworks'
import { getGithubAccessToken } from '../lib/github/get-access-token'
import { githubGetJson, githubPathExists, githubTryGetRaw, githubGraphQL } from '../lib/github/client'
import { parseGithubRepoUrl } from '../lib/github/parse-github-url'
import type { ProgressCallback } from '../lib/github/types'
import { noopProgress } from '../lib/github/types'

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
  console.log(`[RepoService] Parsed URL: owner=${owner}, repo=${repo}`)

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

  await onProgress(25, 'Detecting frameworks and tech stack...')
  const frameworks = new Set<string>()
  const techStack = new Set<string>()

  await detectNodeStack(owner, repo, token, frameworks, techStack)
  await detectPythonStack(owner, repo, token, frameworks, techStack)
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

  await onProgress(70, 'Fetching repository file tree for visual map...')
  let folderStructure = null
  try {
    const branch = repoData.default_branch || 'main'
    const treeRes = await githubGetJson<GithubTreeResponse>(`${repoPath}/git/trees/${branch}?recursive=1`, token)
    
    const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'out', 'vendor', '.cache', '.github', '.vscode', '.idea', 'target', 'bin', 'obj'])
    const IGNORED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '.DS_Store', 'Thumbs.db'])

    folderStructure = treeRes.tree.filter(node => {
      const parts = node.path.split('/')
      
      // Filter out ignored directories
      if (parts.some(part => IGNORED_DIRS.has(part))) return false
      
      const filename = parts[parts.length - 1]
      // Filter out ignored files
      if (IGNORED_FILES.has(filename)) return false

      return true
    })
  } catch (err) {
    console.error(`[RepoService] Tree fetch error:`, err)
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
  token: string,
  frameworks: Set<string>,
  techStack: Set<string>
): Promise<void> => {
  const raw = await githubTryGetRaw(`/repos/${owner}/${repo}/contents/package.json`, token)
  if (raw === null) return

  detectNpmFrameworks(parsePackageJson(raw), frameworks)
  techStack.add('Node.js')
}

const detectPythonStack = async (
  owner: string,
  repo: string,
  token: string,
  frameworks: Set<string>,
  techStack: Set<string>
): Promise<void> => {
  const raw = await githubTryGetRaw(`/repos/${owner}/${repo}/contents/requirements.txt`, token)
  if (raw === null) return

  detectPythonFrameworks(parseRawContent(raw), frameworks)
  techStack.add('Python')
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
