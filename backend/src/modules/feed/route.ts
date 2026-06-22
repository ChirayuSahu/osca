import { Router } from 'express'
import { FeedController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.get('/', authMiddleware, FeedController.getFeed)

export const feedRouter = router
