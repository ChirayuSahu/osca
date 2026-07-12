import { Router } from 'express'
import { AuthController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.get('/github', AuthController.redirectToGithub)
router.get('/github/callback', AuthController.handleGithubCallback)
router.get('/dev-token', AuthController.getDevToken)
router.get('/me', authMiddleware, AuthController.getCurrentUser)

export const authRouter = router
