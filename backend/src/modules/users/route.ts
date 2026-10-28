import { Router } from 'express'

import { UserController } from './controller'

import { authMiddleware } from '../../middlewares/auth.middleware'

import { jobLimiter } from '../../middlewares/rate-limit.middleware'



const router = Router()



router.get('/:id', authMiddleware, UserController.getUser)

router.put('/:id', authMiddleware, UserController.updateUser)

router.post('/:id/analyze', authMiddleware, jobLimiter, UserController.analyzeProfile)

router.get('/:id/not-interested', authMiddleware, UserController.listNotInterested)

router.delete('/:id', authMiddleware, UserController.deleteUser)



export const usersRouter = router

