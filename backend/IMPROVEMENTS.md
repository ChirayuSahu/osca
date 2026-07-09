# OSCA Backend — Improvement Opportunities

> Full audit of `backend/src/` covering security, performance, code quality, type safety, and missing features.

---

## 🔴 Critical Security

### 1. Hardcoded JWT fallback secret
**File:** `src/config/index.ts`

`jwtSecret` defaults to `'supersecretjwtkey'` when the env var is missing. A misconfigured production deploy silently uses this weak, public key — any attacker can forge valid tokens.

```diff
- jwtSecret: process.env.JWT_SECRET ?? 'supersecretjwtkey',
+ jwtSecret: process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET is required') })(),
```

---

### 2. JWT exposed in URL query parameters
**File:** `src/modules/auth/auth.controller.ts` (OAuth callback redirect)

The token and full user JSON are passed as `?token=...&user=...` query params. This means the JWT leaks into:
- Browser history
- Server access logs
- `Referer` headers sent to third-party scripts

**Fix:** Use a short-lived one-time-code in the redirect URL, then exchange it for the JWT on a separate server-side call.

---

### 3. `dev-token` endpoint can leak in production
**File:** `src/modules/auth/auth.controller.ts` (lines 151–179)

The guard is `config.nodeEnv === 'production'`. If `NODE_ENV` is unset or misspelled, the endpoint is live in production and can return a JWT for any `userId`.

**Fix:** Add a secondary guard (e.g., a secret header) and remove the route entirely from the production bundle.

---

### 4. GitHub OAuth `state` parameter missing (CSRF)
**File:** `src/modules/auth/auth.controller.ts` (redirect handler)

The OAuth flow generates no `state` parameter, leaving the callback open to CSRF / OAuth-hijacking attacks.

**Fix:** Generate a cryptographically random `state`, store it in a short-lived cookie, and verify it on callback.

---

### 5. OAuth access tokens stored in plaintext
**File:** `prisma/schema.prisma` (`OAuthAccount` model)

`accessToken` and `refreshToken` are stored as plain strings. A DB read (SQL injection, misconfigured permissions, backup leak) exposes all tokens immediately.

**Fix:** Encrypt tokens at rest using a KMS-derived key before writing, decrypt on read.

---

### 6. No rate limiting anywhere
**File:** `src/app.ts`

Zero rate-limiting on:
- `POST /auth/github/callback` (token issuance)
- `POST /recommendations/chat` (paid AI endpoint)
- `POST /users/:id/analyze` (GitHub API exhaustion)
- `POST /repositories` (queue flooding)

**Fix:** Add `express-rate-limit` globally and tighter limits on the above routes.

---

### 7. CORS fully open
**File:** `src/app.ts` (line 18)

`app.use(cors())` with no options allows any origin. Fine for public read endpoints — but the auth callback that issues JWTs should restrict origins to `FRONTEND_URL`.

---

### 8. No request body size limit
**File:** `src/app.ts`

`express.json()` has no `limit`. The `/recommendations/chat` endpoint (unbounded `messages[]`) and repo analysis (`url`) are both abusable with large payloads.

```diff
- app.use(express.json());
+ app.use(express.json({ limit: '64kb' }));
```

---

## 🟠 High Severity — Auth & Logic

### 9. Any authenticated user can delete any repository
**File:** `src/modules/repositories/repositories.controller.ts` (`deleteRepository`)

There is no ownership check. Any logged-in user can `DELETE /repositories/:id` and wipe another user's repository from the DB.

**Fix:** Add `WHERE addedBy = req.user.id` to the delete query and throw `403` if not the owner.

---

### 10. Users can write their own `contributionScore`
**File:** `src/modules/users/users.controller.ts` (`updateUser`)

`PUT /users/:id` passes the full body to Prisma. A user can self-assign any `contributionScore`. This is a computed metric and must never be user-writable.

**Fix:** Whitelist only the fields a user is allowed to update (displayName, bio, etc.) and strip all others.

---

### 11. Recommendation `status` accepted without enum validation
**File:** `src/modules/recommendations/recommendations.controller.ts` (lines 131–134)

`status.toUpperCase()` is persisted directly. Any arbitrary string (not just `PENDING | ACCEPTED | REJECTED | COMPLETED`) gets written to the DB.

**Fix:** Validate against the enum before the DB call and throw `400` if invalid.

---

### 12. Token refresh never happens
**File:** `src/modules/auth/auth.controller.ts` (`getGithubAccessToken`)

`OAuthAccount` stores `refreshToken` and `expiresAt`, but the token is never checked for expiry and never refreshed. Expired tokens silently cause GitHub API 401s.

---

## 🟡 Performance

### 13. Feed engine loads all repos into Node.js memory
**File:** `src/services/recommendation-engine.service.ts` (lines 50–73)

Up to 1,000 repositories are fetched, scored in JS, then sliced. At scale this is a memory and latency bomb.

**Fix:** Move scoring into a `ORDER BY` expression or a materialized view in PostgreSQL.

---

### 14. N+1 queries in `getRepository` / `getRepositoryByFullName`
**File:** `src/modules/repositories/repositories.controller.ts` (lines 44–46, 78–80)

For each hidden repo lookup: 3 sequential DB queries fire (`oAuthAccount.findMany` → `user.findUnique` → already-fetched repo). This pattern is copy-pasted verbatim in two handlers.

---

### 15. Interaction service fires N parallel DB upserts per log call
**File:** `src/services/interaction.service.ts` (lines 72–93)

One `upsert` per language/tag. A repo with 10 languages + 10 tech stack tags fires 20 simultaneous DB upserts on every interaction log.

**Fix:** Use a single `INSERT … ON CONFLICT DO UPDATE` with batch values.

---

### 16. GitHub repo search only looks at first 100 repos
**File:** `src/modules/repositories/repositories.service.ts` (lines 80–81)

When a search query is provided, 100 repos are fetched unconditionally and filtered in JS. Users with > 100 repos silently get incomplete results.

---

### 17. Contributor analysis re-hits GitHub every run (no caching)
**File:** `src/services/contributor-analysis.service.ts` (lines 243–265)

Up to 30 repos × 3 API calls each, in sequential batches of 10. No caching: re-running the job is identical to the first run and burns GitHub API quota.

---

### 18. No idempotency guard on job enqueue
**File:** `src/services/job-enqueue.service.ts`

`POST /repositories` and `POST /users/:id/analyze` enqueue a new BullMQ job every call regardless of whether one is already active. Users can spam the endpoint and create dozens of redundant jobs.

**Fix:** Check for an existing `active` or `waiting` job for the same resource before enqueuing.

---

## 🔵 Code Quality / Maintainability

### 19. Fat controller: `repositories/controller.ts` (444 lines)
**File:** `src/modules/repositories/repositories.controller.ts`

`getRepositoryByFullName` (lines 59–242) contains full business logic: GraphQL queries, folder-tree fetching, dependency-graph parsing, fallback logic, and path injection. This belongs in a `RepositoryService` or a dedicated `GithubPreviewService`.

---

### 20. Double error-handling everywhere
Every `asyncHandler` route also has an inner `try/catch`. Since `asyncHandler` already calls `next(err)`, one of the two is redundant and adds noise. Choose one pattern and apply it project-wide.

---

### 21. Duplicate `IGNORED_DIRS` / `IGNORED_FILES` constants
**Files:** `src/modules/repositories/repositories.controller.ts` (lines 172–173) and `src/services/repository-analysis.service.ts` (lines 213–214)

Identical `Set` literals duplicated. Should be a single shared constant in `lib/github/constants.ts`.

---

### 22. Queue names are hard-coded with `dev-` prefix
**File:** `src/config/queue.ts` (lines 7–8)

`QUEUE_NAMES.CONTRIBUTOR_ANALYSIS = 'dev-contributor-analysis'`. The `dev-` prefix is baked in permanently, so production queues still use development names.

---

### 23. Hard-coded mock `linesAdded` fallback stored as real data
**File:** `src/services/contributor-analysis.service.ts` (line 102)

```ts
linesAdded: totalAdditions > 0 ? totalAdditions : 1245 // small mock if 0 for visual
```

The magic number `1245` is persisted into the user's `contributionHistory` as real data.

---

## 🟣 Type Safety

### 24. Pervasive `any` types in analysis services
**File:** `src/services/repository-analysis.service.ts`

`folderStructure`, `dependencies`, `treeRes`, and GitHub API manifests are typed as `any` at ~15 locations. TypeScript gives zero safety over responses that are directly stored in the DB.

---

### 25. `interaction.service.ts` casts `action` without real validation
**File:** `src/modules/interactions/interactions.controller.ts` (line 25)

`action as InteractionAction` is a cast, not validation. Invalid strings slip through unless the weight lookup happens to be falsy — which is not guaranteed.

---

### 26. `jobId` can be `undefined` → malformed `statusUrl`
**Files:** `src/types/jobs.ts` + `src/services/job-enqueue.service.ts`

BullMQ's `job.id` is `string | undefined`. If it's `undefined`, the `statusUrl` becomes `/api/v1/jobs/repository-analysis/` (no ID), silently breaking the polling flow.

---

## 🟤 Missing Features / Obvious Gaps

### 27. Health check doesn't verify DB or Redis
**File:** `src/modules/health/health.service.ts`

Returns `status: 'UP'` based on process uptime only — it never pings PostgreSQL or Redis. Load balancers think the service is healthy even when all dependencies are down.

**Fix:** Add `prisma.$queryRaw('SELECT 1')` and `redis.ping()` checks with appropriate timeouts.

---

### 28. Swagger docs missing major modules
**File:** `swagger.yaml`

The following endpoints have zero documentation:
- `GET /feed`
- `POST /interactions`
- `GET/POST /pulls`
- `POST /repositories/:id/hide`

---

### 29. Prisma `datasource` has no `url` field
**File:** `prisma/schema.prisma`

The datasource block lacks `url = env("DATABASE_URL")`. This is unconventional and causes Prisma CLI commands (`migrate dev`, `db push`) to fail without extra configuration.

---

## Priority Ranking

| Priority | # | Issue | Effort |
|----------|---|-------|--------|
| 🔴 P0 | #1 | Hardcoded JWT secret | XS |
| 🔴 P0 | #2 | JWT in URL query params | M |
| 🔴 P0 | #4 | OAuth CSRF — missing `state` | S |
| 🔴 P0 | #9 | Any user can delete any repo | XS |
| 🔴 P0 | #6 | No rate limiting | S |
| 🟠 P1 | #10 | Users can set own `contributionScore` | XS |
| 🟠 P1 | #11 | Recommendation `status` not validated | XS |
| 🟠 P1 | #3 | `dev-token` endpoint guard | XS |
| 🟡 P2 | #8 | Body size limit | XS |
| 🟡 P2 | #12 | Token refresh | M |
| 🟡 P2 | #18 | No idempotency on job enqueue | S |
| 🟡 P2 | #13 | Feed engine at scale | L |
| 🟡 P2 | #27 | Health check | S |
| 🔵 P3 | #19 | Fat controller refactor | L |
| 🔵 P3 | #20 | Duplicate `try/catch` pattern | M |
| 🔵 P3 | #24 | `any` types in analysis services | M |
| 🔵 P3 | #28 | Swagger coverage | M |
| 🔵 P3 | #22 | Queue name prefix | XS |
| 🔵 P3 | #23 | Mock `linesAdded` | XS |
