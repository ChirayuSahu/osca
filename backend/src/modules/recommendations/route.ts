import { Router } from 'express'
import { RecommendationController } from './controller'
import { ChatController } from './chat-controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.use(authMiddleware)

router.post('/', RecommendationController.createRecommendation)
router.post('/chat', ChatController.chatWithAi)
router.get('/', paginationMiddleware, RecommendationController.listRecommendations)
router.get('/:id', RecommendationController.getRecommendation)
router.patch('/:id', RecommendationController.updateRecommendationStatus)
router.delete('/:id', RecommendationController.deleteRecommendation)

export const recommendationsRouter = router
