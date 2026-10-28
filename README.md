<p align="center">
<a href="https://dscvit.com">
	<img width="400" src="https://user-images.githubusercontent.com/56252312/159312411-58410727-3933-4224-b43e-4e9b627838a3.png#gh-light-mode-only" alt="GDSC VIT"/>
</a>
	<h2 align="center"> < Insert Project Title Here > </h2>
	<h4 align="center"> < Insert Project Description Here > <h4>
</p>

---
[![Join Us](https://img.shields.io/badge/Join%20Us-Developer%20Student%20Clubs-red)](https://dsc.community.dev/vellore-institute-of-technology/)
[![Discord Chat](https://img.shields.io/discord/760928671698649098.svg)](https://discord.gg/498KVdSKWR)

[![DOCS](https://img.shields.io/badge/Documentation-see%20docs-green?style=flat-square&logo=appveyor)](INSERT_LINK_FOR_DOCS_HERE) 
  [![UI ](https://img.shields.io/badge/User%20Interface-Link%20to%20UI-orange?style=flat-square&logo=appveyor)](INSERT_UI_LINK_HERE)


## Features
- [ ]  < feature >
- [ ]  < feature >
- [ ]  < feature >
- [ ]  < feature >

<br>

## Dependencies
 - < dependency >
 - < dependency >


## Running


 < directions to install >
```bash
< insert code >
```

< directions to execute >

```bash
< insert code >
```

---

## Backend Architecture

> Snapshot of the current backend at `backend/` plus a phased plan of improvements. All file references are relative to repo root unless noted.

### Stack at a Glance

| Concern | Choice |
|---|---|
| Runtime | Node.js 20 (Alpine) |
| HTTP framework | Express 5.2 |
| ORM / DB | Prisma 7 + `@prisma/adapter-pg` (raw `pg.Pool`) |
| Job queue | BullMQ 5 on ioredis |
| Cache / RL store | ioredis (shared client, no cluster) |
| Graph DB | neo4j-driver 6 |
| Auth | JWT (HS256) + GitHub OAuth |
| Validation | None (manual `typeof` checks) |
| Logging | `console.*` only (no structured logger) |
| API docs | OpenAPI 3.0 via swagger-ui-express (dev) |
| Tests | None |

### Top-Level Layout (`backend/src`)

```
backend/src/
├── app.ts              # Express composition
├── router.ts           # /api/v1 router
├── index.ts            # Process boot + graceful shutdown
├── config/             # Env-loaded config + queue/swagger/redis
├── middlewares/        # auth, error, rate-limit, pagination, logger
├── modules/            # Domain modules (auth, feed, github, health,
│                       #   interactions, issues, jobs, pulls, reactions,
│                       #   recommendations, repositories, users)
├── services/           # Cross-domain services (analysis, recommendations,
│                       #   interactions, neo4j sync, job enqueue)
├── workers/            # BullMQ workers (contributor, repository analysis)
├── lib/                # Shared clients/errors (github client, etc.)
├── utils/              # Helpers (prisma, redis-client, neo4j, send-response)
└── types/              # Shared TS types
```

### Public Surface (mounted under `/api/v1`)

| Module | Endpoints (summary) |
|---|---|
| `auth` | GitHub OAuth start/callback, dev-token |
| `users` | Get/update self, `requireSelf` guard |
| `repositories` | List, get by id/fullName, analyze, hide, delete |
| `feed` | Personalized feed (Neo4j-backed) |
| `recommendations` | AI chat (OpenRouter) |
| `issues` | List/create issue, comments, sub-issues, reactions |
| `pulls` | Mirror of issues for PRs |
| `interactions` | Click/star/save + comment threads |
| `jobs` | Queue status + job management |
| `reactions` | Emoji reaction catalog |
| `health` | DB/Redis ping |
| `github` (legacy module tree) | To be merged into `lib/github` |

### Environment Variables (`backend/.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `production` triggers stricter startup checks |
| `PORT` | `8000` | HTTP listen port |
| `JWT_SECRET` | weak fallback (refused in prod) | Signs HS256 JWTs |
| `DEV_TOKEN_SECRET` | `''` | Required to enable `auth/dev-token` |
| `FRONTEND_URL` | — | CORS allow-list (single origin) |
| `DATABASE_URL` | — | Postgres connection (Prisma 7 adapter) |
| `DATABASE_POOL_SIZE` | `10` | `pg.Pool` max connections |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS` | — | ioredis settings |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | `password` | Neo4j credentials |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | — | OAuth app |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | — | AI chat |
| `QUEUE_PREFIX` | `dev` | BullMQ queue namespace |
| `RECOMMENDATION_*_WEIGHT` | various | Scoring formula weights (not validated) |
| `COOKIE_SECRET`, `SESSION_SECRET` | — | Cookie signing |

---

## Backend Improvement Plan

Ordered by impact-to-effort. Tags: **(XS)** minutes, **(S)** hours, **(M)** a day, **(L)** multi-day.

### Phase 1 — Security & Hygiene (XS–S)

1. **(XS)** Refuse to boot if `JWT_SECRET` is the literal default string in *any* environment (`backend/src/config/index.ts:8-19`).
2. **(XS)** Enable the global `userRateLimiter` + `ipRateLimiter` (currently commented out in `backend/src/router.ts:18-19`).
3. **(XS)** Add `helmet()` + `app.set('trust proxy', 1)` in `backend/src/app.ts`.
4. **(XS)** Centralize all `process.env` reads in `backend/src/config/index.ts` (currently scattered across `auth/controller.ts`, `chat-controller.ts`, `health.service.ts`).
5. **(S)** Replace JWT-in-URL OAuth callback with a one-time-code exchange (`backend/src/modules/auth/controller.ts:138-144`).
6. **(S)** Encrypt `OAuthAccount.accessToken` / `refreshToken` at rest (Prisma schema `prisma/schema.prisma:32-34`).
7. **(S)** Implement GitHub token refresh using `expiresAt` (`backend/src/lib/github/utils/get-access-token.ts:1-17` + Prisma `OAuthAccount.expiresAt`).
8. **(S)** Add JWT `iss`/`aud`, switch to `kid` for key rotation; JWT lifetime as config.

### Phase 2 — Validation & Error Contract (S–M)

1. **(S)** Adopt `zod`; build `validate(schema)` middleware in `backend/src/middlewares/`.
2. **(S)** Migrate every controller's manual `typeof` checks to Zod schemas (see `repositories/controller.ts:46-51`, `interactions/controller.ts:18-26`, `issues/controller.ts`, `users/controller.ts:36-41`, `auth/controller.ts:178-179`).
3. **(S)** Extend `AppError` with a typed `code` enum (`NotFound`, `BadRequest`, `RateLimited`, `TokenExpired`, `GitHubUpstream`, `Forbidden`).
4. **(S)** Map Prisma known errors (`P2002`, `P2025`, `P2003`) in `error.middleware.ts` and add `requestId` to error bodies.
5. **(M)** Drop the redundant inner `try/catch next(err)` inside `asyncHandler` wrappers (Express 5 supports async handlers natively).

### Phase 3 — Observability (S–M)

1. **(S)** Bring in `pino` + `pino-http` with `genReqId` (reuse `x-request-id` or `crypto.randomUUID()`) in `backend/src/middlewares/logger.middleware.ts`.
2. **(S)** Propagate `requestId` into BullMQ job data (`backend/src/services/job-enqueue.service.ts`) and read it in both workers.
3. **(S)** Register `unhandledException` in `backend/src/index.ts`.
4. **(M)** Add `/metrics` (Prometheus): HTTP histogram, BullMQ exporter (`prom-bullmq-exporter`), Prisma `$on('query')`, Neo4j session acquire.
5. **(M)** Surface worker liveness in `/health` (currently only DB+Redis are probed in `backend/src/modules/health/health.service.ts`).
6. **(M)** Stop swallowing worker init errors in `backend/src/workers/index.ts:20-24`; reflect on health endpoint.

### Phase 4 — Resilience (S–M)

1. **(S)** Wrap every outbound HTTP (`backend/src/lib/github/client.ts`, `backend/src/lib/github/services/*`) with `AbortController` + timeout.
2. **(S)** Add a retry helper honoring `Retry-After` on 429 / 5xx (currently 429s bubble up as 502).
3. **(S)** Add a single retry-aware wrapper for the inline OpenRouter fetch in `backend/src/modules/recommendations/chat-controller.ts:56-68`.
4. **(S)** Add Redis response caching keyed by `repo:{id}:fingerprint` (6–24 h TTL) for `repository-analysis.service.ts:382-405`.
5. **(M)** Introduce a circuit breaker (e.g. `opossum`) around Neo4j calls; fall back to Prisma-only paths.
6. **(M)** Return `total` from the same Cypher in `backend/src/services/recommendation-engine.service.ts:179-228` (currently runs the query twice).
7. **(M)** Replace `queue.listUserJobs` (`backend/src/modules/jobs/jobs.service.ts:91-157`) with a per-user Redis sorted set so listing is O(log N).
8. **(M)** Move Neo4j sync to its own BullMQ job type with DLQ so a Neo4j blip doesn't roll back a Postgres commit (`backend/src/workers/repository-analysis.worker.ts:23-38`).

### Phase 5 — Architecture & Maintainability (M–L)

1. **(M)** Delete the duplicate GitHub library (`backend/src/modules/github/*` — `client.ts`, `types.ts`, `detect-frameworks.ts`, `build-skills.ts`, `framework-maps.ts`, `resolve-repo-input.ts`, `parse-github-url.ts`, `get-access-token.ts`); reroute importers (`issues/service.ts`, `pulls/service.ts`) to `backend/src/lib/github/`.
2. **(M)** Extract `RepositoryPreviewService` from `backend/src/modules/repositories/controller.ts` (god method spans `getRepositoryByFullName` lines 76-242 — GraphQL + tree + dependency reasoning + fallback).
3. **(M)** Split `repository-analysis.service.ts` into `analyzer.ts` (frameworks + stack) and `orchestrator.ts` (per-user/per-repo job coordination).
4. **(M)** Split `recommendations/chat-controller.ts` into 3 units: prompt assembly, OpenRouter client, user-context lookup.
5. **(M)** Add a `repository()` data-access layer (`backend/src/db/repositories/*`) with `select`/`include` whitelists so controllers stop calling `prisma.x.findUnique` directly.
6. **(M)** Add Prisma indexes on hot lookups: `UserInteraction(userId, createdAt)`, `UserInterest(userId, score)`, `RepositoryLike(userId)`, `Repository(hidden, stars)`.
7. **(M)** Use a Zod-validated config (`z.object(...).parse(process.env)`) so missing optional envs fail loud, and validate `RECOMMENDATION_*_WEIGHT` to [0, 1].
8. **(L)** Run workers in a separate process: add `npm run worker`, separate Docker target, SIGTERM drain.
9. **(L)** Migrate OpenAPI generation from static `swagger.yaml` to `zod-to-openapi` so docs and types stay in sync; document `feed`, `interactions`, `pulls`, `repositories/:id/hide` (currently undocumented).

### Phase 6 — Testing & CI (M)

1. **(M)** Add Vitest + supertest; cover happy-path for `/health`, `repositories/analyze`, `auth/github/callback`.
2. **(M)** Spin up Postgres via testcontainers for DB integration tests.
3. **(M)** Mock `fetch` (GitHub/OpenRouter) and `neo4j-driver` using `vitest-mock-extended`.
4. **(M)** Add a contract test that validates responses against the OpenAPI schema (`jest-openapi`).
5. **(M)** Add ESLint (flat config) + Prettier + lint-staged + Husky pre-commit hooks.
6. **(M)** Add `.github/workflows/ci.yml` (lint, typecheck, test, `npm audit --production`).

### Phase 7 — Build/Deploy (S–M)

1. **(S)** Dockerfile: `RUN addgroup/adduser` + `USER app`, add `HEALTHCHECK` directive.
2. **(S)** Uncomment Neo4j in `docker-compose.yml:12-22`; add `apoc` plugin and healthchecks for Redis + Neo4j + backend.
3. **(S)** Normalize pagination envelope (`pagination:` vs `meta:` in repositories/feed vs jobs responses).
4. **(M)** Standardize status codes / error contracts; add `Sunset` / `Deprecation` headers when introducing `/api/v2`.

### Out-of-Scope (Database)

- Schema-level concerns (encryption envelope, indexes, partitioning, migration safety) are deferred to the database-architect and tracked separately in `backend/IMPROVEMENTS.md`.

### Consolidated Issues Already Overlapping `backend/IMPROVEMENTS.md`

| # | Existing audit item | Status |
|---|---|---|
| §1 | Hard-coded JWT fallback | Still present — see Phase 1 #1 |
| §2 | JWT in OAuth redirect URL | Still present — see Phase 1 #5 |
| §3 | `dev-token` endpoint guard | Partially mitigated (header secret) — harden further |
| §4 | OAuth `state` CSRF | Done |
| §5 | Plaintext tokens at rest | Open — see Phase 1 #6 |
| §6 | No rate limiting | Partially — re-enable globally (Phase 1 #2) |
| §7 | CORS fully open | Fixed (single origin) |
| §8 | Body size limit | Fixed at 64 kB |
| §9 | Anyone can delete any repo | Fixed (`repositories/controller.ts:281-294`) |
| §10 | User can self-write `contributionScore` | Fixed (`users/controller.ts:36-41`) |
| §11 | `recommendation status` enum not validated | Open — covered by Phase 2 #2 |

## Contributors

<table>
	<tr align="center">
		<td>
		John Doe
		<p align="center">
			<img src = "https://dscvit.com/images/dsc-logo-square.svg" width="150" height="150" alt="Your Name Here (Insert Your Image Link In Src">
		</p>
			<p align="center">
				<a href = "https://github.com/person1">
					<img src = "http://www.iconninja.com/files/241/825/211/round-collaboration-social-github-code-circle-network-icon.svg" width="36" height = "36" alt="GitHub"/>
				</a>
				<a href = "https://www.linkedin.com/in/person1">
					<img src = "http://www.iconninja.com/files/863/607/751/network-linkedin-social-connection-circular-circle-media-icon.svg" width="36" height="36" alt="LinkedIn"/>
				</a>
			</p>
		</td>
	</tr>
</table>

<p align="center">
	Made with ❤ by <a href="https://dscvit.com">GDSC-VIT</a>
</p>
