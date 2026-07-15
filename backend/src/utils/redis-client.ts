import Redis from 'ioredis'
import { config } from '../config'

export const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username || 'default',
  password: config.redis.password,
  enableOfflineQueue: true,
  ...(config.redis.tls ? { tls: {} } : {})
})

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message)
})
