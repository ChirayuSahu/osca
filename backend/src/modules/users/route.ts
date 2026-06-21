import { Router } from 'express'

import { UserController } from './controller'

import { authMiddleware } from '../../middlewares/auth.middleware'



const router = Router()



router.get('/:id', authMiddleware, UserController.getUser)

router.put('/:id', authMiddleware, UserController.updateUser)

router.post('/:id/analyze', authMiddleware, UserController.analyzeProfile)



export const usersRouter = router

