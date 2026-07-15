import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { redisClient } from '../utils/redis-client'

const getUserIdFromRequest = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string }
      return decoded.id
    } catch {
      return undefined
    }
  }
  return undefined
}

const createCustomLimiter = (options: {
  prefix: string
  windowSeconds: number
  maxRequests: number
  skip?: (req: Request) => boolean
  keyGenerator: (req: Request) => string
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (options.skip && options.skip(req)) {
      return next()
    }

    const key = `${options.prefix}${options.keyGenerator(req)}`

    try {
      const pipeline = redisClient.pipeline()
      pipeline.incr(key)
      pipeline.ttl(key)
      const results = await pipeline.exec()

      if (!results) {
        return next()
      }

      const count = results[0][1] as number
      const ttl = results[1][1] as number

      if (count === 1 || ttl === -1) {
        await redisClient.expire(key, options.windowSeconds)
      }

      if (count > options.maxRequests) {
        res.status(429).json({ success: false, message: 'Too many requests, please try again later.' })
        return
      }

      next()
    } catch (error) {
      next()
    }
  }
}

export const userRateLimiter = createCustomLimiter({
  prefix: 'rl:user:',
  windowSeconds: 60,
  maxRequests: 100,
  skip: (req) => !getUserIdFromRequest(req),
  keyGenerator: (req) => getUserIdFromRequest(req) || 'unknown'
})

export const ipRateLimiter = createCustomLimiter({
  prefix: 'rl:ip:',
  windowSeconds: 1,
  maxRequests: 50,
  skip: (req) => !!getUserIdFromRequest(req),
  keyGenerator: (req) => req.ip || 'unknown'
})

export const authLimiter = createCustomLimiter({
  prefix: 'rl:auth:',
  windowSeconds: 15 * 60,
  maxRequests: 20,
  keyGenerator: (req) => req.ip || 'unknown'
})

export const jobLimiter = createCustomLimiter({
  prefix: 'rl:job:',
  windowSeconds: 5 * 60,
  maxRequests: 10,
  keyGenerator: (req) => getUserIdFromRequest(req) || req.ip || 'unknown'
})
