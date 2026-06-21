import { Response } from 'express'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { AppError } from '../../lib/errors'
import { RecommendationEngineService } from '../../services/recommendation-engine.service'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (!userId) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const getFeed = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const limit = parseInt(req.query.limit as string, 10) || 20

  const feed = await RecommendationEngineService.generateFeed(userId, limit)

  sendResponse(res, 200, true, 'Feed retrieved successfully', feed)
})

export const FeedController = {
  getFeed
}
