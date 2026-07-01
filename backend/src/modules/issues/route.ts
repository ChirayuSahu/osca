import { Router } from 'express'
import { IssuesController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.get('/:owner/:repo', authMiddleware, paginationMiddleware, IssuesController.listIssues)
router.get('/:owner/:repo/:issueNumber', authMiddleware, IssuesController.getIssue)
router.get('/:owner/:repo/:issueNumber/comments', authMiddleware, paginationMiddleware, IssuesController.listIssueComments)
router.post('/:owner/:repo', authMiddleware, IssuesController.createIssue)
router.post('/:owner/:repo/:issueNumber/comments', authMiddleware, IssuesController.createIssueComment)
router.delete('/:owner/:repo/comments/:commentId', authMiddleware, IssuesController.deleteIssueComment)

export const issuesRouter = router
