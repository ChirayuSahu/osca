import { Router } from 'express'
import { healthRouter } from './modules/health/health.route'
import { usersRouter } from './modules/users/route'
import { authRouter } from './modules/auth/route'
import { repositoriesRouter } from './modules/repositories/route'
import { recommendationsRouter } from './modules/recommendations/route'
import { jobsRouter } from './modules/jobs/jobs.route'
import { feedRouter } from './modules/feed/route'
import { interactionsRouter } from './modules/interactions/route'
import { issuesRouter } from './modules/issues/route'
import { pullsRouter } from './modules/pulls/route'
import { reactionsRouter } from './modules/reactions/route'

const router = Router()

import { userRateLimiter, ipRateLimiter, authLimiter, jobLimiter } from './middlewares/rate-limit.middleware'

router.use(userRateLimiter)
router.use(ipRateLimiter)

router.use('/health', healthRouter)
router.use('/auth', authLimiter, authRouter)
router.use('/users', jobLimiter, usersRouter)
router.use('/repositories', jobLimiter, repositoriesRouter)
router.use('/recommendations', recommendationsRouter)
router.use('/jobs', jobsRouter)
router.use('/feed', feedRouter)
router.use('/interactions', interactionsRouter)
router.use('/issues', issuesRouter)
router.use('/pulls', pullsRouter)
router.use('/reactions', reactionsRouter)

export const apiRouter = router
