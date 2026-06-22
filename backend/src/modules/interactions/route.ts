import { Router } from 'express'
import { InteractionController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.post('/', authMiddleware, InteractionController.logInteraction)

export const interactionsRouter = router
