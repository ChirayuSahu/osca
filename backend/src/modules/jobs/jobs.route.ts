import { Router } from 'express'
import { JobsController } from './jobs.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.get('/', authMiddleware, paginationMiddleware, JobsController.listUserJobs)
router.get('/:queueName/:jobId', authMiddleware, JobsController.getStatus)

export const jobsRouter = router
