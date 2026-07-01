import { Response, NextFunction } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { resolveRepositoryUrl } from '../../lib/github'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { RepositoryService } from './service'
import { InteractionService } from '../../services/interaction.service'
import { asyncHandler } from '../../utils/async-handler'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const queueRepositoryAnalysis = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const userId = requireUserId(req)
  const url = resolveRepositoryUrl(req.body)
  const queued = await JobEnqueueService.enqueueRepositoryAnalysis(url, userId)

  sendResponse(res, 202, true, 'Repository analysis queued', queued)
  } catch (error) {
    next(error)
  }
})

const getRepository = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const id = String(req.params.id)
  const repository = await prisma.repository.findUnique({ where: { id } })
  assertFound(repository, 'Repository not found')
  sendResponse(res, 200, true, 'Repository retrieved successfully', repository)
  } catch (error) {
    next(error)
  }
})

const listRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  const [total, repos] = await Promise.all([
    prisma.repository.count(),
    prisma.repository.findMany({ skip, take })
  ])

  sendResponse(res, 200, true, 'Repositories retrieved successfully', repos, {
    page: req.pagination?.page ?? 1,
    limit: req.pagination?.limit ?? 10,
    total,
    totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
  })
  } catch (error) {
    next(error)
  }
})

const deleteRepository = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const id = String(req.params.id)
  await prisma.repository.delete({ where: { id } })
  sendResponse(res, 200, true, 'Repository deleted successfully')
  } catch (error) {
    next(error)
  }
})

const listGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
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
  } catch (error) {
    next(error)
  }
})

const listPersonalGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
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
  } catch (error) {
    next(error)
  }
})

const listOrganizationGithubRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
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
  } catch (error) {
    next(error)
  }
})


const toggleRepositoryLike = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
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
    sendResponse(res, 200, true, 'Repository unliked successfully')
    return
  }

  const like = await prisma.repositoryLike.create({
    data: { userId, repositoryId }
  })

  // Automatically log interaction
  await InteractionService.logInteraction(userId, repositoryId, 'REPOSITORY_LIKE')

  sendResponse(res, 201, true, 'Repository liked successfully', like)
  } catch (error) {
    next(error)
  }
})

const searchEasyContributions = asyncHandler(
  async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
    try {
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
    } catch (error) {
      next(error)
    }
  }
)

export const RepositoryController = {
  queueRepositoryAnalysis,
  getRepository,
  listRepositories,
  deleteRepository,
  listGithubRepositories,
  listPersonalGithubRepositories,
  listOrganizationGithubRepositories,
  toggleRepositoryLike,
  searchEasyContributions
}
