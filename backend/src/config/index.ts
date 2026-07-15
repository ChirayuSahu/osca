import dotenv from 'dotenv'

dotenv.config()

const nodeEnv = process.env.NODE_ENV ?? 'development'

// Fail-fast: JWT_SECRET is mandatory in production
if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('[Config] JWT_SECRET environment variable is required in production')
}

export const config = {
  port: process.env.PORT ?? '8000',
  nodeEnv,
  githubClientId: process.env.GITHUB_CLIENT_ID ?? '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL ?? '',
  // Falls back to dev-only default; production enforced above
  jwtSecret: process.env.JWT_SECRET ?? 'supersecretjwtkey-change-me-in-production',
  // Secondary secret required to call the /auth/dev-token endpoint
  devTokenSecret: process.env.DEV_TOKEN_SECRET ?? '',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? '',
  // Prefix for BullMQ queue names (e.g. 'prod', 'staging', 'dev')
  queuePrefix: process.env.QUEUE_PREFIX ?? 'dev',
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true'
  },
  neo4j: {
    uri: process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    user: process.env.NEO4J_USER ?? 'neo4j',
    password: process.env.NEO4J_PASSWORD ?? 'password',
    database: process.env.NEO4J_DATABASE || 'neo4j'
  },
  recommendation: {
    // Weights for the feed's combined score: content (skill match) +
    // collaborative (co-interaction) + topic similarity + normalized stars.
    contentWeight: parseFloat(process.env.RECOMMENDATION_CONTENT_WEIGHT ?? '0.45'),
    collabWeight: parseFloat(process.env.RECOMMENDATION_COLLAB_WEIGHT ?? '0.3'),
    topicWeight: parseFloat(process.env.RECOMMENDATION_TOPIC_WEIGHT ?? '0.2'),
    starsWeight: parseFloat(process.env.RECOMMENDATION_STARS_WEIGHT ?? '0.05')
  }
}
