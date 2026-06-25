import { NextFunction,  Response } from 'express'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { AppError } from '../../lib/errors'
import { InteractionService, InteractionAction } from '../../services/interaction.service'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (!userId) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const logInteraction = asyncHandler(async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
  const userId = requireUserId(req)
  const { repositoryId, action } = req.body

  if (!repositoryId || !action) {
    throw new AppError('repositoryId and action are required', 400)
  }

  await InteractionService.logInteraction(userId, String(repositoryId), action as InteractionAction)

  sendResponse(res, 201, true, 'Interaction logged successfully')
  } catch (error) {
    next(error)
  }
})

export const InteractionController = {
  logInteraction
}
