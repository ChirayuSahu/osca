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
      userId,
      repositoryId,
      fitScore: typeof fitScore === 'number' ? fitScore : 0,
      explanation,
      roadmap: roadmap !== undefined ? roadmap : null,
      status: 'PENDING'
    }
  })
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
    prisma.recommendation.count({ where }),
    prisma.recommendation.findMany({
      where,
      skip,
      take,
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
  const id = String(req.params.id)
  const { status } = req.body

  if (typeof status !== 'string') {
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

export const RecommendationController = {
  createRecommendation,
  getRecommendation,
  listRecommendations,
  updateRecommendationStatus,
  deleteRecommendation
}
