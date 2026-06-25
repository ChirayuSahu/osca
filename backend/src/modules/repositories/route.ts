import { Router } from 'express'

import { RepositoryController } from './controller'

import { authMiddleware } from '../../middlewares/auth.middleware'

import { paginationMiddleware } from '../../middlewares/pagination.middleware'



const router = Router()



router.post('/', authMiddleware, RepositoryController.queueRepositoryAnalysis)

router.post('/analyze', authMiddleware, RepositoryController.queueRepositoryAnalysis)

router.get('/github/personal', authMiddleware, paginationMiddleware, RepositoryController.listPersonalGithubRepositories)

router.get('/github/organization', authMiddleware, paginationMiddleware, RepositoryController.listOrganizationGithubRepositories)

router.get('/github', authMiddleware, paginationMiddleware, RepositoryController.listGithubRepositories)

router.get('/', authMiddleware, paginationMiddleware, RepositoryController.listRepositories)

router.get('/:id', authMiddleware, RepositoryController.getRepository)

router.get('/:id/threads', authMiddleware, paginationMiddleware, RepositoryController.listRepositoryThreads)

router.post('/:id/like', authMiddleware, RepositoryController.toggleRepositoryLike)

router.delete('/:id', authMiddleware, RepositoryController.deleteRepository)



export const repositoriesRouter = router
