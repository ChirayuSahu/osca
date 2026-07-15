export const NPM_FRAMEWORK_MAP: Record<string, string> = {
  // Frontend Frameworks
  react: 'React',
  'react-dom': 'React',
  next: 'Next.js',
  'next.js': 'Next.js',
  vue: 'Vue.js',
  '@vue/core': 'Vue.js',
  nuxt: 'Nuxt.js',
  '@nuxt/core': 'Nuxt.js',
  '@angular/core': 'Angular',
  svelte: 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  solid: 'Solid.js',
  'solid-js': 'Solid.js',
  'preact': 'Preact',
  astro: 'Astro',
  remix: 'Remix',
  '@remix-run/react': 'Remix',
  qwik: 'Qwik',
  '@builder.io/qwik': 'Qwik',
  ember: 'Ember.js',
  'ember-cli': 'Ember.js',
  // Backend Frameworks
  express: 'Express',
  fastify: 'Fastify',
  '@nestjs/core': 'NestJS',
  '@nestjs/common': 'NestJS',
  hapi: 'Hapi.js',
  '@hapi/hapi': 'Hapi.js',
  koa: 'Koa',
  'hono': 'Hono',
  elysia: 'Elysia',
  // CSS / Styling
  tailwindcss: 'Tailwind CSS',
  'styled-components': 'Styled Components',
  '@emotion/react': 'Emotion',
  'bootstrap': 'Bootstrap',
  'antd': 'Ant Design',
  '@mui/material': 'Material UI',
  '@chakra-ui/react': 'Chakra UI',
  'shadcn-ui': 'shadcn/ui',
  // ORMs & Databases
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  mongoose: 'Mongoose',
  sequelize: 'Sequelize',
  typeorm: 'TypeORM',
  drizzle: 'Drizzle ORM',
  'drizzle-orm': 'Drizzle ORM',
  knex: 'Knex.js',
  'pg': 'PostgreSQL',
  'mysql2': 'MySQL',
  'better-sqlite3': 'SQLite',
  redis: 'Redis',
  ioredis: 'Redis',
  // Real-time & APIs
  'socket.io': 'Socket.io',
  ws: 'WebSockets',
  graphql: 'GraphQL',
  'apollo-server': 'Apollo GraphQL',
  '@apollo/server': 'Apollo GraphQL',
  '@trpc/server': 'tRPC',
  '@trpc/client': 'tRPC',
  // State management
  redux: 'Redux',
  '@reduxjs/toolkit': 'Redux Toolkit',
  zustand: 'Zustand',
  jotai: 'Jotai',
  recoil: 'Recoil',
  mobx: 'MobX',
  // Build Tools
  vite: 'Vite',
  webpack: 'Webpack',
  esbuild: 'esbuild',
  rollup: 'Rollup',
  parcel: 'Parcel',
  turbo: 'Turborepo',
  'nx': 'Nx',
  // Mobile / Desktop
  electron: 'Electron',
  'react-native': 'React Native',
  expo: 'Expo',
  // Testing
  jest: 'Jest',
  vitest: 'Vitest',
  mocha: 'Mocha',
  cypress: 'Cypress',
  playwright: 'Playwright',
  '@playwright/test': 'Playwright',
  puppeteer: 'Puppeteer',
  // Auth
  'next-auth': 'NextAuth.js',
  '@auth/core': 'Auth.js',
  'passport': 'Passport.js',
  // CMS
  'contentful': 'Contentful',
  sanity: 'Sanity',
  strapi: 'Strapi',
  // Other
  'docker-compose': 'Docker',
  'zod': 'Zod',
  'class-validator': 'class-validator',
  'bull': 'Bull Queue',
  'bullmq': 'BullMQ'
}

export const PYTHON_FRAMEWORK_MAP: Record<string, string> = {
  django: 'Django',
  'django-rest-framework': 'Django REST Framework',
  djangorestframework: 'Django REST Framework',
  flask: 'Flask',
  fastapi: 'FastAPI',
  starlette: 'Starlette',
  tornado: 'Tornado',
  aiohttp: 'aiohttp',
  sanic: 'Sanic',
  litestar: 'Litestar',
  tensorflow: 'TensorFlow',
  torch: 'PyTorch',
  pytorch: 'PyTorch',
  numpy: 'NumPy',
  pandas: 'Pandas',
  'scikit-learn': 'scikit-learn',
  sklearn: 'scikit-learn',
  keras: 'Keras',
  celery: 'Celery',
  sqlalchemy: 'SQLAlchemy',
  alembic: 'Alembic',
  pydantic: 'Pydantic',
  pytest: 'pytest',
  langchain: 'LangChain',
  openai: 'OpenAI',
  transformers: 'HuggingFace Transformers',
  diffusers: 'HuggingFace Diffusers',
  httpx: 'HTTPX',
  requests: 'Requests',
  uvicorn: 'Uvicorn',
  gunicorn: 'Gunicorn',
  poetry: 'Poetry'
}

// Files that indicate CI/CD systems
export const CI_CD_FILE_MAP: Array<{ path: string; name: string }> = [
  { path: '.github/workflows', name: 'GitHub Actions' },
  { path: '.github/actions', name: 'GitHub Actions' },
  { path: 'Jenkinsfile', name: 'Jenkins' },
  { path: '.circleci/config.yml', name: 'CircleCI' },
  { path: '.travis.yml', name: 'Travis CI' },
  { path: '.travis.yaml', name: 'Travis CI' },
  { path: 'Dockerfile', name: 'Docker' },
  { path: 'docker-compose.yml', name: 'Docker Compose' },
  { path: 'docker-compose.yaml', name: 'Docker Compose' },
  { path: '.gitlab-ci.yml', name: 'GitLab CI' },
  { path: '.gitlab-ci.yaml', name: 'GitLab CI' },
  { path: 'azure-pipelines.yml', name: 'Azure Pipelines' },
  { path: 'azure-pipelines.yaml', name: 'Azure Pipelines' },
  { path: 'bitbucket-pipelines.yml', name: 'Bitbucket Pipelines' },
  { path: 'vercel.json', name: 'Vercel' },
  { path: '.vercel/project.json', name: 'Vercel' },
  { path: '.vercel', name: 'Vercel' },
  { path: 'netlify.toml', name: 'Netlify' },
  { path: '.netlify', name: 'Netlify' },
  { path: 'fly.toml', name: 'Fly.io' },
  { path: 'railway.toml', name: 'Railway' },
  { path: 'render.yaml', name: 'Render' },
  { path: '.buildkite/pipeline.yml', name: 'Buildkite' },
  { path: 'Makefile', name: 'Make' },
  { path: 'taskfile.yml', name: 'Task' },
  { path: 'Taskfile.yml', name: 'Task' }
]

// Files/dirs that indicate additional tech stacks by language/platform
export const STACK_FILE_INDICATORS: Array<{ path: string; tech: string; framework?: string }> = [
  { path: 'go.mod', tech: 'Go' },
  { path: 'go.sum', tech: 'Go' },
  { path: 'Cargo.toml', tech: 'Rust' },
  { path: 'pom.xml', tech: 'Java' },
  { path: 'build.gradle', tech: 'Java/Gradle' },
  { path: 'build.gradle.kts', tech: 'Kotlin' },
  { path: 'Gemfile', tech: 'Ruby' },
  { path: 'composer.json', tech: 'PHP' },
  { path: 'pubspec.yaml', tech: 'Dart/Flutter', framework: 'Flutter' },
  { path: 'mix.exs', tech: 'Elixir' },
  { path: 'Package.swift', tech: 'Swift' },
  { path: 'pyproject.toml', tech: 'Python' },
  { path: 'setup.py', tech: 'Python' },
  { path: 'setup.cfg', tech: 'Python' },
  { path: 'deno.json', tech: 'Deno' },
  { path: 'deno.jsonc', tech: 'Deno' },
  { path: 'bun.lockb', tech: 'Bun' },
  { path: '.terraform', tech: 'Terraform' },
  { path: 'serverless.yml', tech: 'Serverless Framework' }
]

// ─── Shared File-Tree Filter Constants ───────────────────────────────────────
// #21: Single source of truth — used by repositories controller AND
// repository-analysis service to avoid duplication.

export const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  'out', 'vendor', '.cache', '.github', '.vscode', '.idea',
  'target', 'bin', 'obj'
])

export const IGNORED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  '.DS_Store', 'Thumbs.db'
])

// ─── GitHub Reactions ─────────────────────────────────────────────────────────

export const VALID_REACTIONS = ['+1', '-1', 'laugh', 'hooray', 'confused', 'heart', 'rocket', 'eyes'] as const
export type ReactionContent = typeof VALID_REACTIONS[number]

export const isValidReaction = (content: string): content is ReactionContent =>
  (VALID_REACTIONS as readonly string[]).includes(content)
