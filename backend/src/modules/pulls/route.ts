import { Router } from 'express'
import { PullsController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.get('/:owner/:repo', authMiddleware, paginationMiddleware, PullsController.listPulls)
router.get('/:owner/:repo/:pullNumber', authMiddleware, PullsController.getPull)
router.get('/:owner/:repo/:pullNumber/comments', authMiddleware, paginationMiddleware, PullsController.listPullComments)
router.post('/:owner/:repo/:pullNumber/comments', authMiddleware, PullsController.createPullComment)

// ─── Reactions ───────────────────────────────────────────────────────────────
// Pull request reactions
router.get('/:owner/:repo/:pullNumber/reactions', authMiddleware, PullsController.listPullReactions)
router.post('/:owner/:repo/:pullNumber/reactions', authMiddleware, PullsController.addPullReaction)
router.delete('/:owner/:repo/:pullNumber/reactions/:reactionId', authMiddleware, PullsController.deletePullReaction)

// Pull request comment reactions
router.get('/:owner/:repo/comments/:commentId/reactions', authMiddleware, PullsController.listPullCommentReactions)
router.post('/:owner/:repo/comments/:commentId/reactions', authMiddleware, PullsController.addPullCommentReaction)
router.delete('/:owner/:repo/comments/:commentId/reactions/:reactionId', authMiddleware, PullsController.deletePullCommentReaction)

export const pullsRouter = router
