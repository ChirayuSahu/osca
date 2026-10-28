import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { config } from './config'
import { mountSwaggerDocs } from './config/swagger'
import { apiRouter } from './router'
import { errorMiddleware, CustomError } from './middlewares/error.middleware'
import { requestLogger } from './middlewares/logger.middleware'

const app: Application = express()

// Only trust X-Forwarded-For behind a real reverse proxy (TRUST_PROXY=1). With the
// API port reachable directly, trusting it lets clients fake their IP and dodge
// the per-IP rate limits.
app.set('trust proxy', config.trustProxy)
app.use(helmet())
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? [config.frontendUrl]
    : [config.frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}))
app.use(express.json({ limit: '64kb' }))
app.use(express.urlencoded({ extended: true, limit: '64kb' }))
app.use(cookieParser())
app.use(requestLogger)

mountSwaggerDocs(app)

app.use('/api/v1', apiRouter)

app.use((req: Request, res: Response, next: NextFunction) => {
  const error: CustomError = new Error(`Cannot ${req.method} ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
})

app.use(errorMiddleware)

export default app
