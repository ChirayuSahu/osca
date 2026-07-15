import { Router } from 'express'
import { ChatController } from './chat-controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.post('/chat', ChatController.chatWithAi)

export const recommendationsRouter = router
