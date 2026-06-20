import { Router } from 'express'
import { RepositoryController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { paginationMiddleware } from '../../middlewares/pagination.middleware'

const router = Router()

router.post('/', authMiddleware, RepositoryController.createRepository)
router.get('/github', authMiddleware, paginationMiddleware, RepositoryController.listGithubRepositories)
router.get('/', authMiddleware, paginationMiddleware, RepositoryController.listRepositories)
router.get('/:id', authMiddleware, RepositoryController.getRepository)
router.delete('/:id', authMiddleware, RepositoryController.deleteRepository)

export const repositoriesRouter = router
