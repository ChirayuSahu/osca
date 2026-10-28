import { Router } from 'express'
import { ChatController } from './chat-controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { chatLimiter } from '../../middlewares/rate-limit.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { sendResponse } from '../../utils/send-response'
import { RequestWithUser } from '../../middlewares/auth.middleware'
import { getIssueRecommendations } from '../../services/issue-recommendation.service'
import { recordEvents } from '../../services/recommendation-events.service'

const router = Router()

router.use(authMiddleware)

router.post('/chat', chatLimiter, ChatController.chatWithAi)

// Unclaimed starter issues from your best-matching repositories
router.get('/issues', asyncHandler(async (req: RequestWithUser, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '30'), 10) || 30, 1), 60)
  const issues = await getIssueRecommendations(req.user!.id, limit)
  sendResponse(res, 200, true, 'Issue recommendations retrieved successfully', issues)
}))

// What you did with recommendations (shown, opened, liked, hidden...), in batches
router.post('/events', asyncHandler(async (req: RequestWithUser, res) => {
  const recorded = await recordEvents(req.user!.id, req.body)
  sendResponse(res, 202, true, 'Events recorded', { recorded })
}))

export const recommendationsRouter = router
