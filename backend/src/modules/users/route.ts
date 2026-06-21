<<<<<<< HEAD
import { Router } from 'express'
import { UserController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.get('/:id', UserController.getUser)
router.put('/:id', authMiddleware, UserController.updateUser)

export const usersRouter = router
=======
import { Router } from 'express'
import { UserController } from './controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.get('/:id', authMiddleware, UserController.getUser)
router.put('/:id', authMiddleware, UserController.updateUser)
router.post('/:id/analyze', authMiddleware, UserController.analyzeProfile)

export const usersRouter = router
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
