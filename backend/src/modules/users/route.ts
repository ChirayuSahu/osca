import { Router } from 'express'
import { UserController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.get('/:id', UserController.getUser)
router.put('/:id', authMiddleware, UserController.updateUser)

export const usersRouter = router
