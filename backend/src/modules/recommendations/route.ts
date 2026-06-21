import { Router } from 'express'
import { RecommendationController } from './controller'
<<<<<<< HEAD
=======
import { authMiddleware } from '../../middlewares/auth.middleware'
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

<<<<<<< HEAD
=======
router.use(authMiddleware)

>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
router.post('/', RecommendationController.createRecommendation)
router.get('/', paginationMiddleware, RecommendationController.listRecommendations)
router.get('/:id', RecommendationController.getRecommendation)
router.patch('/:id', RecommendationController.updateRecommendationStatus)
router.delete('/:id', RecommendationController.deleteRecommendation)

export const recommendationsRouter = router
