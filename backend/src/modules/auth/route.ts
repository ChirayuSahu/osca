import { Router } from 'express'
import { AuthController } from './controller'

const router = Router()

router.get('/github', AuthController.redirectToGithub)
router.get('/github/callback', AuthController.handleGithubCallback)

export const authRouter = router
