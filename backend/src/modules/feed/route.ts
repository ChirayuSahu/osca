import { Router } from 'express'
import { FeedController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.get('/', authMiddleware, paginationMiddleware, FeedController.getFeed)

export const feedRouter = router
