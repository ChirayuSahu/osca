import dotenv from 'dotenv'

dotenv.config()

const INSECURE_JWT_PLACEHOLDERS = ['supersecretjwtkey-change-me-in-production', 'your_super_secret_jwt_key']

const nodeEnv = process.env.NODE_ENV ?? 'development'

// No fallback in any environment: a known default lets anyone forge tokens.
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('[Config] JWT_SECRET environment variable is required')
}

if (INSECURE_JWT_PLACEHOLDERS.includes(jwtSecret)) {
  throw new Error(
    `[Config] JWT_SECRET is set to an insecure placeholder. Choose a strong, unique secret.`
  )
}

if (jwtSecret.length < 32) {
  throw new Error('[Config] JWT_SECRET must be at least 32 characters long')
}

export const config = {
  port: process.env.PORT ?? '8000',
  nodeEnv,
  // Number of reverse-proxy hops to trust for client IPs; 0 when the API is exposed directly
  trustProxy: parseInt(process.env.TRUST_PROXY ?? '0', 10) || false,
  githubClientId: process.env.GITHUB_CLIENT_ID ?? '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL ?? '',
  // Server-side token for work no user initiated (repository seeding/discovery).
  // A fine-grained PAT with public read access is enough.
  githubServerToken: process.env.GITHUB_TOKEN ?? '',
  jwtSecret,
  jwtIssuer: process.env.JWT_ISSUER ?? 'osca',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'osca-web',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
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
    // collaborative (co-interaction) + topic similarity + normalized stars +
    // approachability. Each component is in [0, 1], so these sum to ~1.
    contentWeight: parseFloat(process.env.RECOMMENDATION_CONTENT_WEIGHT ?? '0.4'),
    collabWeight: parseFloat(process.env.RECOMMENDATION_COLLAB_WEIGHT ?? '0.15'),
    topicWeight: parseFloat(process.env.RECOMMENDATION_TOPIC_WEIGHT ?? '0.15'),
    starsWeight: parseFloat(process.env.RECOMMENDATION_STARS_WEIGHT ?? '0.05'),
    // How easy the repo is for a newcomer: good first issues, activity, contributing guide
    approachabilityWeight: parseFloat(process.env.RECOMMENDATION_APPROACHABILITY_WEIGHT ?? '0.25'),
    // Subtracted for topics shared with repos the user marked "not for me"
    dislikeWeight: parseFloat(process.env.RECOMMENDATION_DISLIKE_WEIGHT ?? '0.15')
  }
}
