import { prisma } from '../../utils/prisma'
import { redisClient } from '../../utils/redis-client'

interface DependencyStatus {
  status: 'UP' | 'DOWN'
  error?: string
}

interface HealthDetails {
  status: 'UP' | 'DEGRADED'
  timestamp: string
  uptime: number
  db: DependencyStatus
  redis: DependencyStatus
}

// #27: Check DB and Redis before reporting healthy.
// Load balancers should use this to determine if the instance can serve traffic.
const checkHealth = async (): Promise<HealthDetails> => {
  const [dbResult, redisResult] = await Promise.allSettled([
    // Lightweight DB ping
    prisma.$queryRaw`SELECT 1`.then(() => ({ status: 'UP' as const })),
    // Redis ping
    redisClient.ping().then(() => ({ status: 'UP' as const }))
  ])

  const db: DependencyStatus = dbResult.status === 'fulfilled'
    ? dbResult.value
    : { status: 'DOWN', error: (dbResult.reason as Error)?.message ?? 'Unknown error' }

  const redis: DependencyStatus = redisResult.status === 'fulfilled'
    ? redisResult.value
    : { status: 'DOWN', error: (redisResult.reason as Error)?.message ?? 'Unknown error' }

  const overallStatus = db.status === 'UP' && redis.status === 'UP' ? 'UP' : 'DEGRADED'

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db,
    redis
  }
}

export const HealthService = {
  checkHealth
}
