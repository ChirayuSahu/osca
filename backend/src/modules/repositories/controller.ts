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

  const result = await RepositoryService.listGithubRepositories(userId, page, limit)

  sendResponse(res, 200, true, 'User GitHub repositories retrieved successfully', result.repos, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  })
})

export const RepositoryController = {
  queueRepositoryAnalysis,
  getRepository,
  listRepositories,
  deleteRepository,
  listGithubRepositories
}
