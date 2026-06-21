<<<<<<< HEAD
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../utils/prisma'
import { sendResponse } from '../../utils/send-response'
import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'

const createRecommendation = (req: Request, res: Response, next: NextFunction): void => {
  const { userId, repositoryId, fitScore, explanation, roadmap } = req.body

  if (typeof userId !== 'string' || typeof repositoryId !== 'string' || typeof explanation !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Missing required fields: userId, repositoryId, and explanation must be strings'
    })
    return
  }

  prisma.recommendation.upsert({
    where: {
      userId_repositoryId: {
        userId,
=======
import { Response } from 'express'
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

const createRecommendation = asyncHandler(async (req: RequestWithUser, res: Response) => {
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
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
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
<<<<<<< HEAD
      userId,
=======
      userId: targetUserId,
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
      repositoryId,
      fitScore: typeof fitScore === 'number' ? fitScore : 0,
      explanation,
      roadmap: roadmap !== undefined ? roadmap : null,
      status: 'PENDING'
    }
  })
<<<<<<< HEAD
    .then((recommendation) => {
      sendResponse(res, 201, true, 'Recommendation created successfully', recommendation)
    })
    .catch((error) => {
      next(error)
    })
}

const getRecommendation = (req: Request, res: Response, next: NextFunction): void => {
  const id = String(req.params.id)

  prisma.recommendation.findUnique({
    where: { id },
    include: {
      user: true,
      repository: true
    }
  })
    .then((rec) => {
      if (rec === null) {
        sendResponse(res, 404, false, 'Recommendation not found')
        return
      }
      sendResponse(res, 200, true, 'Recommendation retrieved successfully', rec)
    })
    .catch((error) => {
      next(error)
    })
}

const listRecommendations = (req: RequestWithPaginationAndUser, res: Response, next: NextFunction): void => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  const where = userId !== undefined ? { userId } : undefined

  Promise.all([
=======

  sendResponse(res, 201, true, 'Recommendation created successfully', recommendation)
})

const getRecommendation = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const requesterId = requireUserId(req)
  const id = String(req.params.id)

  await assertRecommendationOwner(id, requesterId)

  const recommendation = await prisma.recommendation.findUnique({
    where: { id },
    include: { repository: true }
  })

  sendResponse(res, 200, true, 'Recommendation retrieved successfully', assertFound(recommendation, 'Recommendation not found'))
})

const listRecommendations = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response) => {
  const requesterId = requireUserId(req)
  const skip = req.pagination?.skip
  const take = req.pagination?.take

  const where = { userId: requesterId }

  const [total, recs] = await Promise.all([
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
    prisma.recommendation.count({ where }),
    prisma.recommendation.findMany({
      where,
      skip,
      take,
<<<<<<< HEAD
      include: {
        repository: true
      }
    })
  ])
    .then(([total, recs]) => {
      sendResponse(
        res,
        200,
        true,
        'Recommendations retrieved successfully',
        recs,
        {
          page: req.pagination?.page ?? 1,
          limit: req.pagination?.limit ?? 10,
          total,
          totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
        }
      )
    })
    .catch((error) => {
      next(error)
    })
}

const updateRecommendationStatus = (req: Request, res: Response, next: NextFunction): void => {
=======
      include: { repository: true }
    })
  ])

  sendResponse(res, 200, true, 'Recommendations retrieved successfully', recs, {
    page: req.pagination?.page ?? 1,
    limit: req.pagination?.limit ?? 10,
    total,
    totalPages: Math.ceil(total / (req.pagination?.limit ?? 10))
  })
})

const updateRecommendationStatus = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const requesterId = requireUserId(req)
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
  const id = String(req.params.id)
  const { status } = req.body

  if (typeof status !== 'string') {
<<<<<<< HEAD
    res.status(400).json({
      success: false,
      message: 'Status must be a string'
    })
    return
  }

  prisma.recommendation.update({
    where: { id },
    data: { status: status.toUpperCase() }
  })
    .then((rec) => {
      sendResponse(res, 200, true, 'Recommendation status updated successfully', rec)
    })
    .catch((error) => {
      next(error)
    })
}

const deleteRecommendation = (req: Request, res: Response, next: NextFunction): void => {
  const id = String(req.params.id)

  prisma.recommendation.delete({
    where: { id }
  })
    .then(() => {
      sendResponse(res, 200, true, 'Recommendation deleted successfully')
    })
    .catch((error) => {
      next(error)
    })
}
=======
    throw new AppError('Status must be a string', 400)
  }

  await assertRecommendationOwner(id, requesterId)

  const recommendation = await prisma.recommendation.update({
    where: { id },
    data: { status: status.toUpperCase() }
  })

  sendResponse(res, 200, true, 'Recommendation status updated successfully', recommendation)
})

const deleteRecommendation = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const requesterId = requireUserId(req)
  const id = String(req.params.id)

  await assertRecommendationOwner(id, requesterId)
  await prisma.recommendation.delete({ where: { id } })

  sendResponse(res, 200, true, 'Recommendation deleted successfully')
})
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9

export const RecommendationController = {
  createRecommendation,
  getRecommendation,
  listRecommendations,
  updateRecommendationStatus,
  deleteRecommendation
}
