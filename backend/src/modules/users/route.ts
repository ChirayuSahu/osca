import { Router } from 'express'
import { UserController } from './controller'

const router = Router()

router.get('/:id', UserController.getUser)
router.put('/:id', UserController.updateUser)

export const usersRouter = router
