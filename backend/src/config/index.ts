import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: process.env.PORT ?? '8000',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  githubClientId: process.env.GITHUB_CLIENT_ID ?? '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'supersecretjwtkey',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  }
}
