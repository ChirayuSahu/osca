import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { config } from '../config'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

const pool = globalForPrisma.pool ?? new Pool({
  connectionString: config.databaseUrl,
  // #P-9: Configurable pool size. Default 10 for production; use DATABASE_POOL_SIZE env var.
  // (Was hardcoded to 2, causing contention with concurrent workers + API requests)
  max: parseInt(process.env.DATABASE_POOL_SIZE ?? '10', 10)
})
if (config.nodeEnv !== 'production') {
  globalForPrisma.pool = pool
}

const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma
}
