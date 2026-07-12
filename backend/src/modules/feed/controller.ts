import { NextFunction,  Response } from 'express'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { AppError } from '../../lib/errors'
import { RecommendationEngineService } from '../../services/recommendation-engine.service'

import { RequestWithPaginationAndUser } from '../../middlewares/pagination.middleware'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (!userId) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const getFeed = asyncHandler(async (req: RequestWithPaginationAndUser, res: Response, next: NextFunction) => {
  try {
  const userId = requireUserId(req)
  const page = req.pagination?.page || 1
  const limit = req.pagination?.limit || 20

  const result = await RecommendationEngineService.generateFeed(userId, page, limit)

  sendResponse(res, 200, true, 'Feed retrieved successfully', result.feed, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  })
  } catch (error) {
    next(error)
  }
})

export const FeedController = {
  getFeed
}
