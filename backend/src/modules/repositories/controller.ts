import { Response, NextFunction } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { resolveRepositoryUrl, getGithubIdForUser } from '../../lib/github'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { AnalysisRequestService } from '../../services/analysis-request.service'
import { rebuildProfileIfOwnRepository } from '../../services/profile-refresh.service'
import { RepositoryService } from './service'
import { NOT_INTERESTED_ACTION } from '../../services/recommendation-engine.service'
import { InteractionService } from '../../services/interaction.service'
import { clearIssueRecommendations } from '../../services/issue-recommendation.service'
import { Neo4jSyncService } from '../../services/neo4j-sync.service'
import { githubGetJson, githubTryGetRaw, githubGraphQL } from '../../lib/github/client'
import { decryptToken } from '../../lib/crypto/token-cipher'
import { asyncHandler } from '../../utils/async-handler'
import { IGNORED_DIRS, IGNORED_FILES } from '../../lib/github/utils/constants'
import type { Prisma, Repository } from '@prisma/client'

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
  await AnalysisRequestService.recordQueued(userId, url)
  const queued = await JobEnqueueService.enqueueRepositoryAnalysis(url, userId, false)
  await AnalysisRequestService.setJobId(userId, url, queued.jobId)
  sendResponse(res, 202, true, 'Repository analysis queued', queued)
})

const queueForceRepositoryAnalysis = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const url = resolveRepositoryUrl(req.body)
  await AnalysisRequestService.recordQueued(userId, url)
  const queued = await JobEnqueueService.enqueueRepositoryAnalysis(url, userId, true)
  await AnalysisRequestService.setJobId(userId, url, queued.jobId)
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

  const userId = req.user?.id
  const [likeCount, myLike] = await Promise.all([
    prisma.repositoryLike.count({ where: { repositoryId: id } }),
    userId ? prisma.repositoryLike.findUnique({ where: { userId_repositoryId: { userId, repositoryId: id } } }) : null
  ])

  sendResponse(res, 200, true, 'Repository retrieved successfully', {
    ...repository,
    likeCount,
    likedByMe: !!myLike
  })
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
  const githubToken = decryptToken(account.accessToken)

  try {
    const ghRepo = await githubGetJson<any>(`/repos/${owner}/${repo}`, githubToken)

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
      const depRes = await githubGraphQL<any>(query, githubToken, { owner, repo }, 'application/vnd.github.hawkgirl-preview+json')
      dependencies = depRes.data?.repository?.dependencyGraphManifests?.nodes || []
    } catch (err) {
      console.error(`[RepoPreview] Dependency graph error:`, err)
    }

    if (dependencies.length === 0) {
      try {
        const rawPkg = await githubTryGetRaw(`/repos/${owner}/${repo}/contents/package.json`, githubToken)
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
        treeRes = await githubGetJson<any>(`${repoPath}/git/trees/${branch}?recursive=1`, githubToken)
      } catch (err) {
        console.warn(`[RepoPreview] Recursive tree fetch failed for ${owner}/${repo}, falling back to shallow.`, err)
        treeRes = await githubGetJson<any>(`${repoPath}/git/trees/${branch}`, githubToken)
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
    // Only a real not-found is a 404; token problems (403, kept as the client
    // raised them for the reconnect prompt) and rate limits (429) pass through
    if (ghError instanceof AppError && ghError.statusCode === 404) {
      throw new AppError('Repository not found on GitHub', 404)
    }
    if (ghError instanceof AppError) throw ghError
    console.error(`[RepoPreview] GitHub request failed for ${fullName}:`, ghError)
    throw new AppError('Could not reach GitHub. Try again in a moment.', 502)
  }
})

// `?scope=imported` lists only what the requesting user imported, plus repos
// they own on GitHub; the default lists the whole visible catalogue.
const listRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  let where: Prisma.RepositoryWhereInput = { hidden: false }
  if (req.query.scope === 'imported') {
    const userId = requireUserId(req)
    const accounts = await prisma.oAuthAccount.findMany({ where: { userId }, select: { username: true } })
    const logins = accounts.map(a => a.username)
    where = {
      OR: [
        { imports: { some: { userId } } },
        ...(logins.length ? [{ owner: { in: logins, mode: 'insensitive' as const } }] : [])
      ]
    }
  }

  const [total, repos] = await Promise.all([
    prisma.repository.count({ where }),
    prisma.repository.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
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
  Neo4jSyncService.removeRepository(id).catch((error) => {
    console.error(`[Neo4jSync] Failed to remove deleted repository ${id}:`, error)
  })
  RepositoryService.excludeFromDiscovery(repository.fullName).catch((error) => {
    console.error(`[Repositories] Failed to exclude ${repository.fullName} from discovery:`, error)
  })
  sendResponse(res, 200, true, 'Repository deleted successfully')
})

// Adds an already-analyzed catalogue repo to the user's imports. No analysis
// job is needed: the repo row, its graph data and signals already exist.
const addRepositoryImport = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const repositoryId = String(req.params.id)
  const repository = await prisma.repository.findUnique({ where: { id: repositoryId } })
  if (!repository) {
    throw new AppError('Repository not found', 404)
  }
  if (repository.hidden) await assertRepositoryVisible(repository, userId)

  const existing = await prisma.repositoryImport.findUnique({
    where: { userId_repositoryId: { userId, repositoryId } }
  })
  if (!existing) {
    await prisma.repositoryImport.create({ data: { userId, repositoryId } })
    await rebuildProfileIfOwnRepository(userId, repository).catch((error) => {
      console.error(`[Repositories] Failed to queue profile rebuild for user ${userId}:`, error)
    })
  }
  sendResponse(res, existing ? 200 : 201, true, existing ? 'Repository already imported' : 'Repository imported', {
    repositoryId,
    alreadyImported: !!existing
  })
})

// Removes the repo from the requesting user's imports only; the shared
// repository row (and everyone else's imports) stay intact.
const removeRepositoryImport = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const id = String(req.params.id)

  const { count } = await prisma.repositoryImport.deleteMany({ where: { userId, repositoryId: id } })
  if (count === 0) {
    throw new AppError('Repository is not in your imports', 404)
  }
  sendResponse(res, 200, true, 'Repository removed from your imports')
})

// "Not interested": hides the repo from this user's feed. Recorded apart from
// logInteraction, which would count it as interest in the repo's languages.
const markNotInterested = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const repositoryId = String(req.params.id)
  assertFound(await prisma.repository.findUnique({ where: { id: repositoryId }, select: { id: true } }), 'Repository not found')

  const existing = await prisma.userInteraction.findFirst({ where: { userId, repositoryId, action: NOT_INTERESTED_ACTION } })
  if (!existing) {
    await prisma.userInteraction.create({ data: { userId, repositoryId, action: NOT_INTERESTED_ACTION, weight: 0 } })
  }

  const githubId = await getGithubIdForUser(userId)
  if (githubId !== null) {
    Neo4jSyncService.syncInteraction(githubId, repositoryId, NOT_INTERESTED_ACTION).catch((error) => {
      console.error(`[Neo4jSync] Failed to sync not-interested for user ${userId}, repo ${repositoryId}:`, error)
    })
  }
  // Next issues are drawn from the feed, so they're rebuilt without this repo
  await clearIssueRecommendations(userId)
  sendResponse(res, 201, true, 'Repository hidden from your feed')
})

const clearNotInterested = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const repositoryId = String(req.params.id)

  await prisma.userInteraction.deleteMany({ where: { userId, repositoryId, action: NOT_INTERESTED_ACTION } })
  const githubId = await getGithubIdForUser(userId)
  if (githubId !== null) {
    Neo4jSyncService.removeInteraction(githubId, repositoryId, NOT_INTERESTED_ACTION).catch((error) => {
      console.error(`[Neo4jSync] Failed to clear not-interested for user ${userId}, repo ${repositoryId}:`, error)
    })
  }
  await clearIssueRecommendations(userId)
  sendResponse(res, 200, true, 'Repository restored to your feed')
})

// Open good-first issues for a repository, for the newcomer panel.
const listStarterIssues = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const repository = await prisma.repository.findUnique({ where: { id: String(req.params.id) } })
  if (!repository) {
    throw new AppError('Repository not found', 404)
  }
  if (repository.hidden) await assertRepositoryVisible(repository, userId)

  const issues = await RepositoryService.listStarterIssues(userId, repository.owner, repository.name)
  sendResponse(res, 200, true, 'Starter issues retrieved successfully', issues)
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

const searchGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const userId = requireUserId(req)
  const page = req.pagination?.page ?? 1
  const limit = req.pagination?.limit ?? 10
  const search = typeof req.query.q === 'string' ? req.query.q : ''
  const goodFirstOnly = req.query.goodFirst === 'true'

  const result = await RepositoryService.searchGithubRepositories(userId, search, page, limit, goodFirstOnly)

  sendResponse(res, 200, true, 'GitHub repositories found', result.repos, {
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

    await clearIssueRecommendations(userId)
    sendResponse(res, 200, true, 'Repository unliked successfully')
    return
  }

  const like = await prisma.repositoryLike.create({
    data: { userId, repositoryId }
  })

  // Automatically log interaction (also syncs an INTERACTED_WITH edge to Neo4j)
  await InteractionService.logInteraction(userId, repositoryId, 'REPOSITORY_LIKE')
  // Likes shape the feed the next issues are drawn from
  await clearIssueRecommendations(userId)

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

// Analyses you asked for that aren't imports yet: queued, analyzing (with
// progress) or failed (with the reason)
const listAnalysisRequests = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const requests = await AnalysisRequestService.listOpen(requireUserId(req))
  sendResponse(res, 200, true, 'Analysis requests retrieved successfully', requests)
})

const dismissAnalysisRequest = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const dismissed = await AnalysisRequestService.dismiss(requireUserId(req), String(req.params.requestId))
  if (!dismissed) throw new AppError('Analysis request not found', 404)
  sendResponse(res, 200, true, 'Analysis request dismissed')
})

export const RepositoryController = {
  listAnalysisRequests,
  dismissAnalysisRequest,
  queueRepositoryAnalysis,
  queueForceRepositoryAnalysis,
  getRepository,
  hideRepository,
  getRepositoryByFullName,
  listRepositories,
  deleteRepository,
  addRepositoryImport,
  removeRepositoryImport,
  listStarterIssues,
  markNotInterested,
  clearNotInterested,
  listGithubRepositories,
  searchGithubRepositories,
  listPersonalGithubRepositories,
  listOrganizationGithubRepositories,
  toggleRepositoryLike,
  searchEasyContributions
}
