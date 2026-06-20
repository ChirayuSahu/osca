# OSCA (Open Source Contributor Matching Platform) - Agent Context

This document provides future AI agents with the complete context, feature roadmap, and current architectural state of the OSCA platform.

## Project Overview

OSCA is an intelligent platform designed to match open-source contributors with suitable repositories based on their skills, experience, and interests.

**Tech Stack:** Next.js (Frontend), Node.js/Express (Backend), Prisma ORM + PostgreSQL, BullMQ + Redis (async jobs).

---

## Feature Roadmap

### Review 1: Core MVP (In Progress)

- **Authentication:** GitHub OAuth, JWT bearer auth, user profile management
- **Repository analysis:** Deep GitHub analysis (languages, frameworks, CI/CD, tech stack) via async workers
- **Contributor analysis:** GitHub profile skill extraction via async workers
- **Matching system:** Recommendation CRUD (automated fit-score engine planned)
- **Database:** User, OAuthAccount, Repository, ContributorProfile, Recommendation

### Review 2: Collaborative Ecosystem (Planned)

Hub, insights, discussions, advanced recommendation engine, full profile/settings.

---

## Backend Architecture

The backend follows **route → controller → service** with long-running GitHub work offloaded to **BullMQ + Redis**.

### Directory Structure

```text
backend/src/
├── app.ts                      # Express setup and route mounting
├── index.ts                    # HTTP server, worker init, graceful shutdown
├── config/
│   ├── index.ts                # Environment variables (DB, OAuth, JWT, Redis)
│   ├── queue.ts                # BullMQ queue singletons
│   └── redis.ts                # Redis connection for BullMQ
├── lib/
│   ├── errors.ts               # AppError, assertFound
│   └── github/                 # GitHub API client, URL parsing, framework detection
├── middlewares/
│   ├── auth.middleware.ts      # JWT verification (throws AppError)
│   ├── error.middleware.ts     # Global error handler
│   └── pagination.middleware.ts
├── modules/
│   ├── auth/                   # GitHub OAuth + JWT issuance
│   ├── users/                  # Profile CRUD + contributor analysis trigger
│   ├── repositories/           # Repo CRUD + repository analysis trigger + GitHub repo listing
│   ├── recommendations/        # Recommendation CRUD (auth required, owner-scoped)
│   ├── jobs/                   # GET /jobs/:queue/:jobId — poll async job status
│   └── health/
├── services/
│   ├── repository-analysis.service.ts   # Deep repo analysis (worker-only)
│   ├── contributor-analysis.service.ts  # Profile skill analysis (worker-only)
│   └── job-enqueue.service.ts           # Centralized BullMQ enqueue helpers
├── types/
│   └── jobs.ts                 # Shared BullMQ job payload/result types
├── utils/
│   ├── prisma.ts               # Prisma client singleton
│   ├── send-response.ts        # Standard JSON response envelope
│   ├── async-handler.ts        # Async Express route wrapper
│   └── user-response.ts        # Safe Prisma selects (no OAuth tokens in API output)
└── workers/
    ├── index.ts
    ├── contributor-analysis.worker.ts
    └── repository-analysis.worker.ts
```

### Prisma

- Schema: `backend/prisma/schema.prisma`
- Client: `@prisma/client` (standard output via `prisma-client-js`)
- Connection: `utils/prisma.ts` with `@prisma/adapter-pg`
- Migrations: `npm run db:migrate:dev` (local), `npm run db:migrate` (production)

### Authentication & Security

1. **GitHub OAuth:** `GET /api/v1/auth/github` → callback → returns JWT JSON `{ user, token }`.
2. **JWT:** Send as `Authorization: Bearer <token>` on protected routes.
3. **OAuth tokens** are stored in `OAuthAccount` and **never returned** in API responses.
4. **User routes** are self-service only (`GET/PUT/POST .../users/:id` requires `req.user.id === :id`).
5. **Recommendation routes** require auth and are scoped to the authenticated user.
6. **Job status** is restricted to the user who enqueued the job (`job.data.userId`).

### Async Analysis Flow

Heavy GitHub processing **must** go through BullMQ:

| Action | Endpoint | Response |
|--------|----------|----------|
| Deep repository analysis | `POST /api/v1/repositories` or `POST /api/v1/repositories/analyze` | `202` + `{ jobId, queue, statusUrl }` |
| Contributor profile analysis | `POST /api/v1/users/:id/analyze` | `202` + `{ jobId, queue, statusUrl }` |
| Poll job progress | `GET /api/v1/jobs/:queueName/:jobId` | Job state + progress |

Body for repository analysis: `{ "url": "https://github.com/owner/repo" }` or `{ "owner": "...", "repo": "..." }` or `{ "fullName": "owner/repo" }`.

`GET /api/v1/repositories/github` lists the authenticated user's GitHub repos (lightweight, synchronous — no deep analysis).

### Environment Variables

See `backend/.env.example`. Required for full functionality:

- `DATABASE_URL`, `JWT_SECRET`, `GITHUB_CLIENT_*`, `FRONTEND_URL`
- `REDIS_HOST`, `REDIS_PORT` (optional `REDIS_PASSWORD`) for BullMQ

### Local Development

```bash
cd backend
docker compose up -d   # PostgreSQL + Redis
npm install
npm run db:migrate:dev
npm run dev
```

---

## Agent Guidelines

1. **Do not reintroduce sync deep GitHub analysis** in controllers — enqueue via `JobEnqueueService`.
2. **Do not expose** `OAuthAccount.accessToken` or `refreshToken` in API responses.
3. **Use** `lib/github/client.ts` for all GitHub HTTP calls (not ad-hoc fetch/axios in controllers).
4. **Use** `AppError` + `asyncHandler` for consistent error handling.
5. **No GitLab** for MVP unless explicitly requested.
6. Keep new logic in the **service layer**; controllers should stay thin.
