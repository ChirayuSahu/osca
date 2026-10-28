import { Router } from 'express'
import { RepositoryController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'
import { jobLimiter, searchLimiter } from '../../middlewares/rate-limit.middleware'
import { registerGithubParamValidators } from '../../middlewares/github-params.middleware'

const router = Router()
registerGithubParamValidators(router)

router.post('/', authMiddleware, jobLimiter, RepositoryController.queueRepositoryAnalysis)
router.post('/analyze', authMiddleware, jobLimiter, RepositoryController.queueRepositoryAnalysis)
router.post('/analyze/force', authMiddleware, jobLimiter, RepositoryController.queueForceRepositoryAnalysis)
router.get('/github/search', authMiddleware, searchLimiter, paginationMiddleware, RepositoryController.searchGithubRepositories)
router.get('/github/personal', authMiddleware, paginationMiddleware, RepositoryController.listPersonalGithubRepositories)
router.get('/github/organization', authMiddleware, paginationMiddleware, RepositoryController.listOrganizationGithubRepositories)
router.get('/github', authMiddleware, paginationMiddleware, RepositoryController.listGithubRepositories)
router.get('/discover/easy-contributions', authMiddleware, paginationMiddleware, RepositoryController.searchEasyContributions)
router.get('/', authMiddleware, paginationMiddleware, RepositoryController.listRepositories)
// Must precede '/:owner/:repo', which would otherwise capture it
router.get('/:id/starter-issues', authMiddleware, RepositoryController.listStarterIssues)
router.get('/:owner/:repo', authMiddleware, RepositoryController.getRepositoryByFullName)
router.get('/:id', authMiddleware, RepositoryController.getRepository)
router.post('/:id/hide', authMiddleware, RepositoryController.hideRepository)
router.post('/:id/like', authMiddleware, RepositoryController.toggleRepositoryLike)
router.post('/:id/not-interested', authMiddleware, RepositoryController.markNotInterested)
router.delete('/:id/not-interested', authMiddleware, RepositoryController.clearNotInterested)
router.post('/:id/import', authMiddleware, RepositoryController.addRepositoryImport)
router.delete('/:id/import', authMiddleware, RepositoryController.removeRepositoryImport)
router.delete('/:id', authMiddleware, RepositoryController.deleteRepository)

export const repositoriesRouter = router
