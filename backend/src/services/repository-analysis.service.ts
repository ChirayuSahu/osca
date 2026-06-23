import { prisma } from '../utils/prisma'
import { AppError } from '../lib/errors'
import {
  detectNpmFrameworks,
  detectPythonFrameworks,
  parsePackageJson,
  parseRawContent
} from '../modules/github/detect-frameworks'
import { getGithubAccessToken } from '../modules/github/get-access-token'
import { githubGetJson, githubPathExists, githubTryGetRaw } from '../modules/github/client'
import { parseGithubRepoUrl } from '../modules/github/parse-github-url'
import type { ProgressCallback } from '../modules/github/types'
import { noopProgress } from '../modules/github/types'

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
      ciCd: analysis.ciCd
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
      ciCd: analysis.ciCd
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

  await onProgress(60, 'Repository tech stack analysis complete')

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
    ciCd
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
