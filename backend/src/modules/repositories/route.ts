import { Router } from 'express'
import { RepositoryController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.post('/', authMiddleware, RepositoryController.queueRepositoryAnalysis)
router.post('/analyze', authMiddleware, RepositoryController.queueRepositoryAnalysis)
router.post('/analyze/force', authMiddleware, RepositoryController.queueForceRepositoryAnalysis)
router.get('/github/personal', authMiddleware, paginationMiddleware, RepositoryController.listPersonalGithubRepositories)
router.get('/github/organization', authMiddleware, paginationMiddleware, RepositoryController.listOrganizationGithubRepositories)
router.get('/github', authMiddleware, paginationMiddleware, RepositoryController.listGithubRepositories)
router.get('/discover/easy-contributions', authMiddleware, paginationMiddleware, RepositoryController.searchEasyContributions)
router.get('/', authMiddleware, paginationMiddleware, RepositoryController.listRepositories)
router.get('/:owner/:repo', authMiddleware, RepositoryController.getRepositoryByFullName)
router.get('/:id', authMiddleware, RepositoryController.getRepository)
router.post('/:id/hide', authMiddleware, RepositoryController.hideRepository)
router.post('/:id/like', authMiddleware, RepositoryController.toggleRepositoryLike)
router.delete('/:id', authMiddleware, RepositoryController.deleteRepository)

export const repositoriesRouter = router
