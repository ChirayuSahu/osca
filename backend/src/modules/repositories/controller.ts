import { Response, NextFunction } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { resolveRepositoryUrl } from '../../lib/github/resolve-repo-input'
import { JobEnqueueService } from '../../services/job-enqueue.service'
import { RepositoryService } from './service'
import { asyncHandler } from '../../utils/async-handler'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const queueRepositoryAnalysis = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const url = resolveRepositoryUrl(req.body)
  const queued = await JobEnqueueService.enqueueRepositoryAnalysis(url, userId)

  sendResponse(res, 202, true, 'Repository analysis queued', queued)
})

const getRepository = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
  const repository = await prisma.repository.findUnique({ where: { id } })
  assertFound(repository, 'Repository not found')
  sendResponse(res, 200, true, 'Repository retrieved successfully', repository)
})

const listRepositories = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
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
})

const deleteRepository = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = String(req.params.id)
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

const listRepositoryThreads = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const repositoryId = String(req.params.id)
  const skip = req.pagination?.skip ?? 0
  const take = req.pagination?.take ?? 10
  
  // ensure repository exists
  const repo = await prisma.repository.findUnique({ where: { id: repositoryId } })
  assertFound(repo, 'Repository not found')

  const [total, threads] = await Promise.all([
    prisma.repositoryThread.count({ where: { repositoryId } }),
    prisma.repositoryThread.findMany({
      where: { repositoryId },
      skip,
      take,
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true }
        },
        _count: { select: { comments: true } }
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' }
      ]
    })
  ])

  sendResponse(res, 200, true, 'Repository threads retrieved successfully', threads, {
    page: req.pagination?.page ?? 1,
    limit: req.pagination?.limit ?? 10,
    total,
    totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
  })
})

export const RepositoryController = {
  queueRepositoryAnalysis,
  getRepository,
  listRepositories,
  deleteRepository,
  listGithubRepositories,
  listPersonalGithubRepositories,
  listOrganizationGithubRepositories,
  listRepositoryThreads
}
