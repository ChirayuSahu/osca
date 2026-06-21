import { Router } from 'express'
import { CommentController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.post('/', authMiddleware, CommentController.createComment)
router.get('/', authMiddleware, paginationMiddleware, CommentController.getComments)
router.put('/:id', authMiddleware, CommentController.updateComment)
router.delete('/:id', authMiddleware, CommentController.deleteComment)
router.post('/:id/vote', authMiddleware, CommentController.voteComment)

export const commentsRouter = router
