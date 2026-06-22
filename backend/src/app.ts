import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { mountSwaggerDocs } from './config/swagger'
import { healthRouter } from './modules/health/health.route'
import { usersRouter } from './modules/users/route'
import { authRouter } from './modules/auth/route'
import { repositoriesRouter } from './modules/repositories/route'
import { recommendationsRouter } from './modules/recommendations/route'
import { jobsRouter } from './modules/jobs/jobs.route'
import { threadsRouter } from './modules/threads/route'
import { commentsRouter } from './modules/comments/route'
import { feedRouter } from './modules/feed/route'
import { interactionsRouter } from './modules/interactions/route'
import { errorMiddleware, CustomError } from './middlewares/error.middleware'

const app: Application = express()

app.use(cors())
app.use(express.json())

mountSwaggerDocs(app)

app.use('/api/v1/health', healthRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/repositories', repositoriesRouter)
app.use('/api/v1/recommendations', recommendationsRouter)
app.use('/api/v1/jobs', jobsRouter)
app.use('/api/v1/threads', threadsRouter)
app.use('/api/v1/comments', commentsRouter)
app.use('/api/v1/feed', feedRouter)
app.use('/api/v1/interactions', interactionsRouter)

app.use((req: Request, res: Response, next: NextFunction) => {
  const error: CustomError = new Error(`Cannot ${req.method} ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
})

app.use(errorMiddleware)

export default app
