import { Router } from 'express'
import { JobsController } from './jobs.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.get('/:queueName/:jobId', authMiddleware, JobsController.getStatus)

export const jobsRouter = router
