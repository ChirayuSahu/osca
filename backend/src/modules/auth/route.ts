import { Router } from 'express'
import { AuthController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { authLimiter } from '../../middlewares/rate-limit.middleware'

const router = Router()

router.get('/github', authLimiter, AuthController.redirectToGithub)
router.get('/github/callback', authLimiter, AuthController.handleGithubCallback)
router.post('/exchange', authLimiter, AuthController.exchangeCode)
router.get('/dev-token', authLimiter, AuthController.getDevToken)
router.get('/me', authMiddleware, AuthController.getCurrentUser)

export const authRouter = router
