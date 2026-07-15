import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import Redis from 'ioredis'
import { config } from './config'
import { mountSwaggerDocs } from './config/swagger'
import { healthRouter } from './modules/health/health.route'
import { usersRouter } from './modules/users/route'
import { authRouter } from './modules/auth/route'
import { repositoriesRouter } from './modules/repositories/route'
import { recommendationsRouter } from './modules/recommendations/route'
import { jobsRouter } from './modules/jobs/jobs.route'
import { feedRouter } from './modules/feed/route'
import { interactionsRouter } from './modules/interactions/route'
import { issuesRouter } from './modules/issues/route'
import { pullsRouter } from './modules/pulls/route'
import { reactionsRouter } from './modules/reactions/route'
import { errorMiddleware, CustomError } from './middlewares/error.middleware'

const app: Application = express()

// ─── Redis client for rate limiting ──────────────────────────────
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username || 'default',
  password: config.redis.password,
  enableOfflineQueue: false,
  ...(config.redis.tls ? { tls: {} } : {})
})

redisClient.on('error', (err) => {
  // Registering this handler (rather than leaving it unset) is what prevents
  // ioredis's unhandled 'error' event from crashing the process — still log it.
  console.error('[Redis] Connection error:', err.message)
})

// ─── CORS ─────────────────────────────────────────────────────────
// #7: Restrict to known frontend origin
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}))

// ─── Body parsing ─────────────────────────────────────────────────
// #8: 64kb body size limit prevents oversized payload attacks
app.use(express.json({ limit: '64kb' }))
app.use(express.urlencoded({ extended: true, limit: '64kb' }))
app.use(cookieParser())

// ─── Rate Limiting ────────────────────────────────────────────────
// #6: Global limiter — 100 req / 1 min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
})

// Tighter limiter for auth endpoints — 20 req / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests, please try again later.' }
})

// Tight limiter for expensive job-enqueue endpoints — 10 req / 5 min
const jobLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many analysis requests, please slow down.' }
})

app.use(globalLimiter)

// ─── Request Logger ───────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`)
  })
  next()
})

mountSwaggerDocs(app)

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/v1/health', healthRouter)
app.use('/api/v1/auth', authLimiter, authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/repositories', repositoriesRouter)
app.use('/api/v1/recommendations', recommendationsRouter)
app.use('/api/v1/jobs', jobsRouter)
app.use('/api/v1/feed', feedRouter)
app.use('/api/v1/interactions', interactionsRouter)
app.use('/api/v1/issues', issuesRouter)
app.use('/api/v1/pulls', pullsRouter)
app.use('/api/v1/reactions', reactionsRouter)

// Apply tight limit on job-enqueue routes
app.use('/api/v1/repositories', jobLimiter)
app.use('/api/v1/users', jobLimiter)

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const error: CustomError = new Error(`Cannot ${req.method} ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
})

app.use(errorMiddleware)

export { redisClient }
export default app
