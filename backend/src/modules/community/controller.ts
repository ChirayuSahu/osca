import { Response } from 'express'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { AppError } from '../../lib/errors'
import { CommunityService } from './service'

const MAX_LIMIT = 30

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (!userId) throw new AppError('Unauthorized', 401)
  return userId
}

const parseLimit = (value: unknown, fallback: number): number => {
  const parsed = parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : fallback
}

const listContributors = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const contributors = await CommunityService.listContributors(requireUserId(req), parseLimit(req.query.limit, 12))
  sendResponse(res, 200, true, 'Contributors retrieved successfully', contributors)
})

const listCollaborations = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const collaborations = await CommunityService.listCollaborations(requireUserId(req), parseLimit(req.query.limit, 10))
  sendResponse(res, 200, true, 'Collaboration opportunities retrieved successfully', collaborations)
})

export const CommunityController = {
  listContributors,
  listCollaborations
}
