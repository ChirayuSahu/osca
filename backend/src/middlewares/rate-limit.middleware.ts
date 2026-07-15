import { Request } from 'express'
import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
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
      // Ignore invalid tokens, fallback to IP
      return undefined
    }
  }
  return undefined
}

const store = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
})

export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  store,
  skip: (req: Request) => !getUserIdFromRequest(req),
  keyGenerator: (req: Request): string => {
    return `user:${getUserIdFromRequest(req)}`
  }
})

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  store,
  skip: (req: Request) => !!getUserIdFromRequest(req),
  keyGenerator: (req: Request): string => {
    return `ip:${req.ip || 'unknown'}`
  }
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests, please try again later.' },
  store
})

export const jobLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many analysis requests, please slow down.' },
  store
})
