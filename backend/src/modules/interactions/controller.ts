import { Response } from 'express'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { AppError } from '../../lib/errors'
import { InteractionService, InteractionAction, VALID_INTERACTION_ACTIONS } from '../../services/interaction.service'

const requireUserId = (req: RequestWithUser): string => {
  const userId = req.user?.id
  if (!userId) {
    throw new AppError('Unauthorized', 401)
  }
  return userId
}

const logInteraction = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = requireUserId(req)
  const { repositoryId, action } = req.body

  if (!repositoryId || typeof repositoryId !== 'string') {
    throw new AppError('repositoryId must be a non-empty string', 400)
  }

  if (!action || typeof action !== 'string') {
    throw new AppError('action must be a non-empty string', 400)
  }

  // #25: Runtime validation against the allowed enum — cast is safe after this
  if (!VALID_INTERACTION_ACTIONS.includes(action as InteractionAction)) {
    throw new AppError(
      `Invalid action "${action}". Must be one of: ${VALID_INTERACTION_ACTIONS.join(', ')}`,
      400
    )
  }

  await InteractionService.logInteraction(userId, repositoryId, action as InteractionAction)

  sendResponse(res, 201, true, 'Interaction logged successfully')
})

export const InteractionController = {
  logInteraction
}
