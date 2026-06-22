import { Router } from 'express'
import { ThreadController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.post('/', authMiddleware, ThreadController.createThread)
router.get('/:id', authMiddleware, ThreadController.getThread)
router.put('/:id', authMiddleware, ThreadController.updateThread)

export const threadsRouter = router
