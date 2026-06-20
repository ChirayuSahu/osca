import { ConnectionOptions } from 'bullmq'
import { config } from './index'

/**
 * Returns Redis connection options for BullMQ queues and workers.
 * `maxRetriesPerRequest: null` is required by BullMQ workers.
 */
export const getRedisConnectionOptions = (): ConnectionOptions => ({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null
})
