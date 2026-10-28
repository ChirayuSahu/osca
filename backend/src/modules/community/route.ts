import { Router } from 'express'
import { CommunityController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.get('/contributors', authMiddleware, CommunityController.listContributors)
router.get('/collaborations', authMiddleware, CommunityController.listCollaborations)

export const communityRouter = router
