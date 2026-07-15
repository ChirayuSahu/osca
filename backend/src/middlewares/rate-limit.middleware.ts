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

// Helper to create a dedicated RedisStore per limiter to prevent ERR_ERL_STORE_REUSE
const createRedisStore = (prefix: string) => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    prefix,
  })
}

export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  store: createRedisStore('rl:user:'),
  skip: (req: Request) => !getUserIdFromRequest(req),
  keyGenerator: (req: Request): string => {
    return getUserIdFromRequest(req) || 'unknown'
  }
})

export const ipRateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 50, // 50 requests per second
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  store: createRedisStore('rl:ip:'),
  skip: (req: Request) => !!getUserIdFromRequest(req),
  // Default keyGenerator uses req.ip safely, avoiding ERR_ERL_KEY_GEN_IPV6
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests, please try again later.' },
  store: createRedisStore('rl:auth:')
})

export const jobLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many analysis requests, please slow down.' },
  store: createRedisStore('rl:job:')
})
