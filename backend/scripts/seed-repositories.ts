/**
 * Seeds repository-analysis jobs for a diverse set of real GitHub repos so the
 * Neo4j graph has enough Repository/Language/Framework/Topic nodes for the
 * recommendation engine's content and topic-similarity scoring to be meaningful.
 *
 * Usage: npx ts-node --transpile-only scripts/seed-repositories.ts [username]
 * Requires the target user to already exist with a connected GitHub OAuth
 * account (used to authenticate the GitHub API calls the worker will make).
 * This only enqueues jobs — a running repository-analysis worker (`npm run dev`
 * or the deployed workers) must be up to actually process them.
 */
import { prisma } from '../src/utils/prisma'
import { JobEnqueueService } from '../src/services/job-enqueue.service'
import { closeAllQueues } from '../src/config/queue'

const SEED_REPOS: string[] = [
  // JS/TS frameworks & tooling
  'facebook/react',
  'vuejs/vue',
  'angular/angular',
  'sveltejs/svelte',
  'vercel/next.js',
  'nuxt/nuxt',
  'remix-run/remix',
  'expressjs/express',
  'nestjs/nest',
  'fastify/fastify',
  'vitejs/vite',
  'webpack/webpack',
  'prettier/prettier',
  'tailwindlabs/tailwindcss',
  'denoland/deno',
  'nodejs/node',
  'reduxjs/redux',
  'mui/material-ui',
  'ant-design/ant-design',
  'socketio/socket.io',

  // Python
  'django/django',
  'pallets/flask',
  'tiangolo/fastapi',
  'psf/requests',
  'pandas-dev/pandas',
  'scikit-learn/scikit-learn',
  'pytorch/pytorch',
  'keras-team/keras',
  'celery/celery',
  'home-assistant/core',

  // Go
  'golang/go',
  'gin-gonic/gin',
  'gofiber/fiber',
  'gohugoio/hugo',

  // Rust
  'rust-lang/rust',
  'tokio-rs/tokio',
  'actix/actix-web',

  // Ruby / PHP
  'rails/rails',
  'sinatra/sinatra',
  'laravel/laravel',
  'symfony/symfony',

  // JVM
  'spring-projects/spring-boot',
  'quarkusio/quarkus',
  'JetBrains/kotlin',
  'square/retrofit',
  'elastic/elasticsearch',
  'apache/kafka',

  // C / C++ / Systems
  'torvalds/linux',
  'microsoft/vscode',
  'apple/swift',
  'bitcoin/bitcoin',
  'opencv/opencv',
  'obsproject/obs-studio',
  'godotengine/godot',
  'electron/electron',

  // Graphics / Data Viz
  'mrdoob/three.js',
  'd3/d3',

  // AI / ML
  'huggingface/transformers',
  'langchain-ai/langchain',

  // Mobile
  'flutter/flutter',
  'facebook/react-native',
  'ionic-team/ionic-framework',

  // Infra / DevOps / DB
  'kubernetes/kubernetes',
  'helm/helm',
  'hashicorp/terraform',
  'ansible/ansible',
  'docker/compose',
  'prometheus/prometheus',
  'grafana/grafana',
  'redis/redis',
  'meilisearch/meilisearch',
  'mongodb/node-mongodb-native',
  'supabase/supabase',
  'RocketChat/Rocket.Chat'
]

const main = async () => {
  const username = process.argv[2] || 'ChirayuSahu'

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    throw new Error(`No user found with username "${username}"`)
  }

  console.log(`[Seed] Enqueuing ${SEED_REPOS.length} repository-analysis jobs as user ${username} (${user.id})`)

  let queued = 0
  let alreadyQueued = 0

  for (const fullName of SEED_REPOS) {
    const url = `https://github.com/${fullName}`
    try {
      const result = await JobEnqueueService.enqueueRepositoryAnalysis(url, user.id)
      if (result.alreadyQueued) {
        alreadyQueued++
        console.log(`[Seed] ${fullName} — already queued (${result.jobId})`)
      } else {
        queued++
        console.log(`[Seed] ${fullName} — queued (${result.jobId})`)
      }
    } catch (err) {
      console.error(`[Seed] ${fullName} — failed to enqueue:`, err)
    }
  }

  console.log(`[Seed] Done. ${queued} newly queued, ${alreadyQueued} already in flight, ${SEED_REPOS.length} total.`)

  await closeAllQueues()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[Seed] Fatal error:', err)
  process.exit(1)
})
