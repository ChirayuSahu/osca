import { NextFunction,  Response } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'
import { AppError, assertFound } from '../../lib/errors'
import { asyncHandler } from '../../utils/async-handler'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (userId === undefined) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const assertRecommendationOwner = async (recommendationId: string, userId: string) => {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    select: { userId: true }
  })

  const record = assertFound(recommendation, 'Recommendation not found')
  if (record.userId !== userId) {
    throw new AppError('Forbidden: You can only access your own recommendations', 403)
  }
}

const createRecommendation = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const requesterId = requireUserId(req)
  const { userId, repositoryId, fitScore, explanation, roadmap } = req.body

  if (typeof repositoryId !== 'string' || typeof explanation !== 'string') {
    throw new AppError('repositoryId and explanation are required strings', 400)
  }

  const targetUserId = typeof userId === 'string' ? userId : requesterId
  if (targetUserId !== requesterId) {
    throw new AppError('Forbidden: You can only create recommendations for yourself', 403)
  }

  const recommendation = await prisma.recommendation.upsert({
    where: {
      userId_repositoryId: {
        userId: targetUserId,
        repositoryId
      }
    },
    update: {
      fitScore: typeof fitScore === 'number' ? fitScore : undefined,
      explanation,
      roadmap: roadmap !== undefined ? roadmap : undefined,
      status: 'PENDING'
    },
    create: {
      userId: targetUserId,
      repositoryId,
      fitScore: typeof fitScore === 'number' ? fitScore : 0,
      explanation,
      roadmap: roadmap !== undefined ? roadmap : null,
      status: 'PENDING'
    }
  })

  sendResponse(res, 201, true, 'Recommendation created successfully', recommendation)
  } catch (error) {
    next(error)
  }
})

const getRecommendation = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const requesterId = requireUserId(req)
  const id = String(req.params.id)

  await assertRecommendationOwner(id, requesterId)

  const recommendation = await prisma.recommendation.findUnique({
    where: { id },
    include: { repository: true }
  })

  sendResponse(res, 200, true, 'Recommendation retrieved successfully', assertFound(recommendation, 'Recommendation not found'))
  } catch (error) {
    next(error)
  }
})

const listRecommendations = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
  const requesterId = requireUserId(req)
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  const where = { userId: requesterId }

  const [total, recs] = await Promise.all([
    prisma.recommendation.count({ where }),
    prisma.recommendation.findMany({
      where,
      skip,
      take,
      include: { repository: true }
    })
  ])

  sendResponse(res, 200, true, 'Recommendations retrieved successfully', recs, {
    page: req.pagination?.page ?? 1,
    limit: req.pagination?.limit ?? 10,
    total,
    totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
  })
  } catch (error) {
    next(error)
  }
})

const updateRecommendationStatus = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const requesterId = requireUserId(req)
  const id = String(req.params.id)
  const { status } = req.body

  if (typeof status !== 'string') {
    throw new AppError('Status must be a string', 400)
  }

  await assertRecommendationOwner(id, requesterId)

  const recommendation = await prisma.recommendation.update({
    where: { id },
    data: { status: status.toUpperCase() }
  })

  sendResponse(res, 200, true, 'Recommendation status updated successfully', recommendation)
  } catch (error) {
    next(error)
  }
})

const deleteRecommendation = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const requesterId = requireUserId(req)
  const id = String(req.params.id)

  await assertRecommendationOwner(id, requesterId)
  await prisma.recommendation.delete({ where: { id } })

  sendResponse(res, 200, true, 'Recommendation deleted successfully')
  } catch (error) {
    next(error)
  }
})

export const RecommendationController = {
  createRecommendation,
  getRecommendation,
  listRecommendations,
  updateRecommendationStatus,
  deleteRecommendation
}
