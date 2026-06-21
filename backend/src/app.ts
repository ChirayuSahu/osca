import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
<<<<<<< HEAD
=======
import { mountSwaggerDocs } from './config/swagger'
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
import { healthRouter } from './modules/health/health.route'
import { usersRouter } from './modules/users/route'
import { authRouter } from './modules/auth/route'
import { repositoriesRouter } from './modules/repositories/route'
import { recommendationsRouter } from './modules/recommendations/route'
<<<<<<< HEAD
=======
import { jobsRouter } from './modules/jobs/jobs.route'
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
import { errorMiddleware, CustomError } from './middlewares/error.middleware'

const app: Application = express()

app.use(cors())
app.use(express.json())

<<<<<<< HEAD
=======
mountSwaggerDocs(app)

>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9
app.use('/api/v1/health', healthRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/repositories', repositoriesRouter)
app.use('/api/v1/recommendations', recommendationsRouter)
<<<<<<< HEAD
=======
app.use('/api/v1/jobs', jobsRouter)
>>>>>>> 6a412ca414434aafc0ffe61cd5ab8fb927d96da9

app.use((req: Request, res: Response, next: NextFunction) => {
  const error: CustomError = new Error(`Cannot ${req.method} ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
})

app.use(errorMiddleware)

export default app
