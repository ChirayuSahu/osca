import { Router } from 'express'
import { RecommendationController } from './controller'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.post('/', RecommendationController.createRecommendation)
router.get('/', paginationMiddleware, RecommendationController.listRecommendations)
router.get('/:id', RecommendationController.getRecommendation)
router.patch('/:id', RecommendationController.updateRecommendationStatus)
router.delete('/:id', RecommendationController.deleteRecommendation)

export const recommendationsRouter = router
