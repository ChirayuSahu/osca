import { Response, NextFunction } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { resolveRepositoryUrl, getGithubIdForUser } from '../../lib/github'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { RepositoryService } from './service'
import { InteractionService } from '../../services/interaction.service'
import { Neo4jSyncService } from '../../services/neo4j-sync.service'
import { githubGetJson, githubTryGetRaw, githubGraphQL } from '../../lib/github/client'
import { asyncHandler } from '../../utils/async-handler'
import { IGNORED_DIRS, IGNORED_FILES } from '../../lib/github/utils/constants'
import type { Repository } from '@prisma/client'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

// ─── Shared helper: hidden repo visibility check ────────────────────────────
// #14: Extracted so getRepository and getRepositoryByFullName don't duplicate
// the 3-query N+1 pattern. Uses a single oAuthAccount lookup joined to user.
const assertRepositoryVisible = async (repository: Repository, userId: string): Promise<void> => {
  if (!repository.hidden) return

  const accounts = await prisma.oAuthAccount.findMany({
    where: { userId },
    select: { username: true }
  })
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true }
  })
  const validOwners = [...accounts.map(a => a.username), user?.username].filter(Boolean)

  if (!validOwners.includes(repository.owner)) {
    throw new AppError('Repository not found', 404) // obscure existence of hidden repo
  }
}

const queueRepositoryAnalysis = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const url = resolveRepositoryUrl(req.body)
  const queued = await JobEnqueueService.enqueueRepositoryAnalysis(url, userId, false)
  sendResponse(res, 202, true, 'Repository analysis queued', queued)
})

const queueForceRepositoryAnalysis = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const url = resolveRepositoryUrl(req.body)
  const queued = await JobEnqueueService.enqueueRepositoryAnalysis(url, userId, true)
  sendResponse(res, 202, true, 'Forced repository analysis queued', queued)
})

const getRepository = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  const repository = await prisma.repository.findUnique({ where: { id } })
  if (!repository) {
    throw new AppError('Repository not found', 404)
  }

  if (repository.hidden) {
    const userId = req.user?.id
    if (!userId) throw new AppError('Unauthorized', 401)
    await assertRepositoryVisible(repository, userId)
  }

  sendResponse(res, 200, true, 'Repository retrieved successfully', repository)
})

const getRepositoryByFullName = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { owner, repo } = req.params
  const fullName = `${owner}/${repo}`

  const repository = await prisma.repository.findUnique({
    where: {
      provider_fullName: {
        provider: 'github',
        fullName
      }
    }
  })

  if (repository) {
    if (repository.hidden) {
      const userId = req.user?.id
      if (!userId) throw new AppError('Unauthorized', 401)
      await assertRepositoryVisible(repository, userId)
    }

    sendResponse(res, 200, true, 'Repository retrieved successfully', {
      ...repository,
      imported: true
    })
    return
  }

  // Not found in our DB — fetch preview from GitHub
  const account = await prisma.oAuthAccount.findFirst({
    where: { userId: req.user!.id, provider: 'github' }
  })

  if (!account || !account.accessToken) {
    throw new AppError('GitHub account not connected', 400)
  }

  try {
    const ghRepo = await githubGetJson<any>(`/repos/${owner}/${repo}`, account.accessToken)

    let dependencies: any[] = []
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
      const depRes = await githubGraphQL<any>(query, account.accessToken, { owner, repo }, 'application/vnd.github.hawkgirl-preview+json')
      dependencies = depRes.data?.repository?.dependencyGraphManifests?.nodes || []
    } catch (err) {
      console.error(`[RepoPreview] Dependency graph error:`, err)
    }

    if (dependencies.length === 0) {
      try {
        const rawPkg = await githubTryGetRaw(`/repos/${owner}/${repo}/contents/package.json`, account.accessToken)
        if (rawPkg) {
          const pkgJson = typeof rawPkg === 'string' ? JSON.parse(rawPkg) : rawPkg
          const nodes = []
          const allDeps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) }
          for (const [name, req] of Object.entries(allDeps)) {
            if (typeof req === 'string') {
              nodes.push({ packageName: name, requirements: req, packageManager: 'NPM', hasDependencies: false })
            }
          }
          if (nodes.length > 0) {
            dependencies = [{ blobPath: 'package.json', dependencies: { nodes } }]
          }
        }
      } catch (err) {
        console.error(`[RepoPreview] Dependency fetch error:`, err)
      }
    }

    let folderStructure: any = null
    let isShallow = false
    try {
      const branch = ghRepo.default_branch || 'main'
      const repoPath = `/repos/${owner}/${repo}`
      let treeRes: any

      try {
        treeRes = await githubGetJson<any>(`${repoPath}/git/trees/${branch}?recursive=1`, account.accessToken)
      } catch (err) {
        console.warn(`[RepoPreview] Recursive tree fetch failed for ${owner}/${repo}, falling back to shallow.`, err)
        treeRes = await githubGetJson<any>(`${repoPath}/git/trees/${branch}`, account.accessToken)
        isShallow = true
      }

      // #21: Use shared constants imported from lib/github/utils/constants.ts
      if (treeRes && treeRes.tree) {
        folderStructure = treeRes.tree.filter((node: any) => {
          const parts = node.path.split('/')
          if (parts.some((part: string) => IGNORED_DIRS.has(part))) return false
          const filename = parts[parts.length - 1]
          if (IGNORED_FILES.has(filename)) return false
          return true
        })
      }
    } catch (err) {
      console.error(`[RepoPreview] Tree fetch error:`, err)
    }

    if (isShallow && folderStructure && dependencies.length > 0) {
      const existingPaths = new Set(folderStructure.map((n: any) => n.path))
      dependencies.forEach((manifest: any) => {
        let manifestPath = manifest.blobPath
        if (manifestPath.startsWith('/')) manifestPath = manifestPath.substring(1)

        const parts = manifestPath.split('/')
        let currentPath = ''
        for (let i = 0; i < parts.length; i++) {
          currentPath = i === 0 ? parts[i] : `${currentPath}/${parts[i]}`
          if (!existingPaths.has(currentPath)) {
            existingPaths.add(currentPath)
            folderStructure.push({
              path: currentPath,
              mode: '100644',
              type: i === parts.length - 1 ? 'blob' : 'tree',
              sha: 'dummy-sha-' + currentPath,
              size: 100,
              url: ''
            })
          }
        }
      })
    }

    const previewRepo = {
      id: `gh-${ghRepo.id}`,
      name: ghRepo.name,
      owner: ghRepo.owner.login,
      fullName: ghRepo.full_name,
      provider: 'github',
      githubId: ghRepo.id,
      description: ghRepo.description,
      url: ghRepo.html_url,
      languages: ghRepo.language ? { [ghRepo.language]: 100 } : null,
      frameworks: [],
      techStack: ghRepo.topics || [],
      dependencies,
      folderStructure,
      ciCd: [],
      createdAt: ghRepo.created_at,
      updatedAt: ghRepo.updated_at,
      imported: false,
      _count: { likes: 0, interactions: 0 }
    }

    sendResponse(res, 200, true, 'Repository preview retrieved from GitHub', previewRepo)
  } catch (ghError) {
    throw new AppError('Repository not found on GitHub or unauthorized', 404)
  }
})

const listRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  const [total, repos] = await Promise.all([
    prisma.repository.count({ where: { hidden: false } }),
    prisma.repository.findMany({
      where: { hidden: false },
      skip,
      take,
      omit: {
        folderStructure: true,
        dependencies: true,
        ciCd: false
      }
    })
  ])

  sendResponse(res, 200, true, 'Repositories retrieved successfully', repos, {
    page: req.pagination?.page ?? 1,
    limit: req.pagination?.limit ?? 10,
    total,
    totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
  })
})

// #9: Ownership check — only the user who added the repository can delete it
const deleteRepository = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const id = String(req.params.id)

  const repository = await prisma.repository.findUnique({ where: { id } })
  if (!repository) {
    throw new AppError('Repository not found', 404)
  }

  // Verify the requesting user owns this repository
  const accounts = await prisma.oAuthAccount.findMany({
    where: { userId },
    select: { username: true }
  })
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
  const validOwners = [...accounts.map(a => a.username), user?.username].filter(Boolean)

  if (!validOwners.includes(repository.owner)) {
    throw new AppError('Forbidden: You can only delete your own repositories', 403)
  }

  await prisma.repository.delete({ where: { id } })
  sendResponse(res, 200, true, 'Repository deleted successfully')
})

const listGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const userId = requireUserId(req)
  const page = req.pagination?.page ?? 1
  const limit = req.pagination?.limit ?? 10
  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const includeOrg = req.query.includeOrg === 'true'
  const affiliation = includeOrg ? 'owner,collaborator,organization_member' : 'owner'

  const result = await RepositoryService.listGithubRepositories(userId, page, limit, affiliation, search)

  sendResponse(res, 200, true, 'User GitHub repositories retrieved successfully', result.repos, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  })
})

const listPersonalGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const userId = requireUserId(req)
  const page = req.pagination?.page ?? 1
  const limit = req.pagination?.limit ?? 10
  const search = typeof req.query.q === 'string' ? req.query.q : undefined

  const result = await RepositoryService.listGithubRepositories(userId, page, limit, 'owner', search)

  sendResponse(res, 200, true, 'Personal GitHub repositories retrieved successfully', result.repos, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  })
})

const listOrganizationGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const userId = requireUserId(req)
  const page = req.pagination?.page ?? 1
  const limit = req.pagination?.limit ?? 10
  const search = typeof req.query.q === 'string' ? req.query.q : undefined

  const result = await RepositoryService.listGithubRepositories(
    userId,
    page,
    limit,
    'collaborator,organization_member',
    search
  )

  sendResponse(res, 200, true, 'Organization GitHub repositories retrieved successfully', result.repos, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  })
})

const toggleRepositoryLike = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const repositoryId = String(req.params.id)

  const repo = await prisma.repository.findUnique({ where: { id: repositoryId } })
  assertFound(repo, 'Repository not found')

  const existingLike = await prisma.repositoryLike.findUnique({
    where: {
      userId_repositoryId: { userId, repositoryId }
    }
  })

  if (existingLike) {
    await prisma.repositoryLike.delete({ where: { id: existingLike.id } })

    // Best-effort: keep the Neo4j graph in sync, but don't fail the unlike if Neo4j is unavailable
    const githubId = await getGithubIdForUser(userId)
    if (githubId !== null) {
      Neo4jSyncService.removeInteraction(githubId, repositoryId, 'REPOSITORY_LIKE').catch((error) => {
        console.error(`[Neo4jSync] Failed to remove interaction for user ${userId}, repo ${repositoryId}:`, error)
      })
    }

    sendResponse(res, 200, true, 'Repository unliked successfully')
    return
  }

  const like = await prisma.repositoryLike.create({
    data: { userId, repositoryId }
  })

  // Automatically log interaction (also syncs an INTERACTED_WITH edge to Neo4j)
  await InteractionService.logInteraction(userId, repositoryId, 'REPOSITORY_LIKE')

  sendResponse(res, 201, true, 'Repository liked successfully', like)
})

const searchEasyContributions = asyncHandler(
  async (req: RequestWithPaginationAndUser, res: Response) => {
    const userId = req.user!.id
    const page = req.pagination?.page ?? 1
    const limit = req.pagination?.limit ?? 10
    const language = req.query.language as string | undefined

    const result = await RepositoryService.searchEasyContributionRepos(userId, page, limit, language)

    sendResponse(res, 200, true, 'Easy contribution repositories retrieved successfully', result.repos, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    })
  }
)

const hideRepository = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const id = String(req.params.id)

  const repository = await prisma.repository.findUnique({ where: { id } })
  if (!repository) {
    throw new AppError('Repository not found', 404)
  }

  const accounts = await prisma.oAuthAccount.findMany({ where: { userId } })
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const validOwners = [...accounts.map(a => a.username), user?.username].filter(Boolean)

  if (!validOwners.includes(repository.owner)) {
    throw new AppError('You can only hide your own repositories', 403)
  }

  const updated = await prisma.repository.update({
    where: { id },
    data: { hidden: true }
  })

  sendResponse(res, 200, true, 'Repository hidden successfully', updated)
})

export const RepositoryController = {
  queueRepositoryAnalysis,
  queueForceRepositoryAnalysis,
  getRepository,
  hideRepository,
  getRepositoryByFullName,
  listRepositories,
  deleteRepository,
  listGithubRepositories,
  listPersonalGithubRepositories,
  listOrganizationGithubRepositories,
  toggleRepositoryLike,
  searchEasyContributions
}
