import { Router } from 'express'
import { ReactionsController } from './controller'

const router = Router()

router.get('/', ReactionsController.listValidReactions)

export const reactionsRouter = router
