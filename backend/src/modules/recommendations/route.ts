import { Router } from 'express'
import { ChatController } from './chat-controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { chatLimiter } from '../../middlewares/rate-limit.middleware'

const router = Router()

router.use(authMiddleware)

router.post('/chat', chatLimiter, ChatController.chatWithAi)

export const recommendationsRouter = router
