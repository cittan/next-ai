# Express Backend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the backend Next.js runtime with an Express API and an independently scalable Kafka worker, align every frontend request with a real backend route, and preserve the current OpenAI-compatible/LangGraph behavior during this first phase.

**Architecture:** Add a workspace contracts package shared by the Next.js frontend and Express backend. Keep framework-neutral RAG, Agent, persistence, and document-processing code under `backend/lib`; place HTTP adaptation and application orchestration under `backend/src`; move Kafka consumption into a separate worker entry point. Keep the legacy Next.js routes until all Express routes and frontend consumers pass contract and integration tests, then remove the legacy runtime in one final reversible commit.

**Tech Stack:** TypeScript, Express 5, Zod, Vitest, Supertest, Multer, Next.js 15 frontend, Prisma 7/PostgreSQL, Redis, MinIO, Elasticsearch, pgvector, KafkaJS, OpenAI-compatible SDK, LangChain, LangGraph.

**Spec:** `docs/superpowers/specs/2026-08-17-express-backend-migration-design.md`

## Global Constraints

- Work only on branch `feat/express-backend-migration` and push every completed task to remote `next-ai`.
- Do not add the existing untracked file `backend/lib/rag/channels/面试复习清单.md` to any commit.
- Preserve the current OpenAI SDK and LangGraph behavior in this plan; model-provider unification is a separate second-phase branch and plan.
- Do not run destructive cleanup against pre-existing PostgreSQL rows, Kafka topics, MinIO objects, Elasticsearch indices, or pgvector records.
- All integration resources created by tests must use a unique `it_<timestamp>_<random>` identifier and must be cleaned in `afterAll`/`finally`.
- A task is complete only after its focused tests, package typecheck, related build, diff review, commit, and GitHub push succeed.
- Use the remote name `next-ai`, not `origin`.
- Keep legacy `backend/app/api` routes available as behavior references until Task 12.
- Frontend pages must not contain literal `/api/` request strings after Task 11; route construction belongs to `@next-ai/contracts`.
- API and worker processes must be independently startable; starting Express must never start Kafka consumers.

---

## File Structure Map

### Shared contracts package

- `packages/contracts/package.json` — workspace package metadata and build scripts.
- `packages/contracts/tsconfig.json` — declaration-producing TypeScript build.
- `packages/contracts/src/common.ts` — error and pagination schemas.
- `packages/contracts/src/routes.ts` — all REST route builders.
- `packages/contracts/src/auth.ts` — authentication schemas.
- `packages/contracts/src/chat.ts` — chat, session, exchange, and summary schemas.
- `packages/contracts/src/knowledge.ts` — scope and topic schemas.
- `packages/contracts/src/document.ts` — document, task, and graph schemas.
- `packages/contracts/src/sse.ts` — SSE event discriminated union.
- `packages/contracts/src/index.ts` — public exports.

### Express backend

- `backend/src/app.ts` — Express composition root without `listen()`.
- `backend/src/server.ts` — HTTP startup and graceful shutdown.
- `backend/src/config/runtime.ts` — Express-specific runtime configuration.
- `backend/src/http/errors/app-error.ts` — typed application/HTTP error.
- `backend/src/http/errors/error-handler.ts` — error serialization.
- `backend/src/http/middleware/request-id.ts` — request correlation ID.
- `backend/src/http/middleware/validate.ts` — Zod request validation.
- `backend/src/http/middleware/auth.ts` — Bearer authentication and admin authorization.
- `backend/src/http/routes/*.ts` — router factories, one feature per file.
- `backend/src/http/controllers/*.ts` — HTTP adapters only.
- `backend/src/application/*` — framework-neutral use-case orchestration.
- `backend/src/workers/document.worker.ts` — Kafka worker entry point.
- `backend/src/lifecycle/close-resources.ts` — process resource shutdown.
- `backend/test/unit/**` — pure unit tests.
- `backend/test/http/**` — Supertest tests.
- `backend/test/integration/**` — opt-in real middleware tests.
- `backend/tsconfig.build.json` — CommonJS emit plus alias rewriting.
- `backend/vitest.config.ts` — Vitest aliases and test settings.

### Existing backend modules modified in place

- `backend/lib/service/auth/admin.ts` — stable auth result shape.
- `backend/lib/service/chat/ConversationManager.ts` — ownership-aware queries and atomic exchange lifecycle.
- `backend/lib/service/chat/preparationOrchestrator.ts` — read-only plan preparation.
- `backend/lib/service/document/documentRepository.ts` — document detail/delete-state helpers.
- `backend/lib/service/document/storageService.ts` — deterministic delete compensation support.
- `backend/lib/service/document/keywordService.ts` — delete document index entries.
- `backend/lib/service/document/vectorGatway.ts` — delete document vectors.
- `backend/lib/db/*.ts` — explicit close and health methods.
- `backend/lib/db/kafka.ts` — correct shared consumer groups and testable lifecycle.
- `backend/lib/services/document/AsyncProcessor.ts` — idempotent worker orchestration.
- `backend/lib/models/enum.ts` — cancellation and document lifecycle constants.

### Frontend

- `frontend/lib/client.ts` — typed REST client and unified error handling.
- `frontend/lib/auth.ts` — contract-backed auth client.
- `frontend/lib/chat.ts` — contract-backed session client.
- `frontend/lib/admin.ts` — contract-backed document and knowledge client.
- `frontend/lib/sse-parser.ts` — chunk-safe SSE frame parser.
- `frontend/lib/chat-stream.ts` — POST streaming client and cancellation.
- `frontend/lib/*.test.ts` — client/parser tests.
- `frontend/app/chat/page.tsx` — explicit streaming state machine.
- `frontend/components/chat/SessionList.tsx` — contract-backed session actions and summary.
- `frontend/app/admin/page.tsx` — implemented document/knowledge actions only.
- `frontend/next.config.js` — environment-controlled Express rewrite.

---

### Task 1: Shared Contracts and Express Foundation

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `turbo.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/common.ts`
- Create: `packages/contracts/src/routes.ts`
- Create: `packages/contracts/src/auth.ts`
- Create: `packages/contracts/src/chat.ts`
- Create: `packages/contracts/src/knowledge.ts`
- Create: `packages/contracts/src/document.ts`
- Create: `packages/contracts/src/sse.ts`
- Create: `packages/contracts/src/index.ts`
- Modify: `backend/package.json`
- Create: `backend/tsconfig.build.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/config/runtime.ts`
- Create: `backend/src/http/errors/app-error.ts`
- Create: `backend/src/http/errors/error-handler.ts`
- Create: `backend/src/http/middleware/request-id.ts`
- Create: `backend/src/http/middleware/validate.ts`
- Create: `backend/src/http/routes/health.routes.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/test/http/health.test.ts`
- Create: `backend/test/unit/contracts.test.ts`

**Interfaces:**
- Produces: `apiRoutes`, all request/response Zod schemas, `ChatStreamEventSchema`, `AppError`, `validate()`, `CreateAppOptions`, `createApp()`, and Express `/health/live` plus `/health/ready`.
- Consumes: existing `backend/lib/config.ts`; no existing API route is removed.

- [ ] **Step 1: Add the contracts workspace and backend runtime/test dependencies**

Update `pnpm-workspace.yaml` so the package list is exactly:

```yaml
packages:
  - 'backend'
  - 'frontend'
  - 'packages/*'
allowBuilds:
  '@prisma/engines': true
  esbuild: true
  prisma: true
  sharp: true
```

Run:

Create `packages/contracts/package.json` first with name `@next-ai/contracts`, version `0.1.0`, `private: true`, and a temporary `src/index.ts` exporting nothing. Then run:

```bash
pnpm install
pnpm --filter next-ai-backend add express@^5 cors multer dotenv @next-ai/contracts@workspace:*
pnpm --filter next-ai-backend add -D @types/express @types/cors @types/multer supertest @types/supertest vitest tsx tsc-alias
```

Expected: workspace resolution succeeds and `backend/package.json` contains the new dependencies without removing Next.js yet.

- [ ] **Step 2: Write failing contract tests**

Create `backend/test/unit/contracts.test.ts` with focused assertions:

```ts
import { describe, expect, it } from 'vitest';
import {
  ApiErrorEnvelopeSchema,
  ChatRequestSchema,
  ChatStreamEventSchema,
  PaginationQuerySchema,
  apiRoutes,
} from '@next-ai/contracts';

describe('shared contracts', () => {
  it('coerces pagination query values', () => {
    expect(PaginationQuerySchema.parse({ page: '2', pageSize: '20' })).toEqual({
      page: 2,
      pageSize: 20,
      keyword: undefined,
    });
  });

  it('rejects an empty chat question', () => {
    expect(() => ChatRequestSchema.parse({ question: '   ', chatMode: 'OPEN_CHAT' })).toThrow();
  });

  it('accepts each terminal SSE event shape', () => {
    expect(ChatStreamEventSchema.parse({
      type: 'done',
      conversationId: '8e928b74-7f80-4eb0-9484-3f93460976bb',
      exchangeId: 1,
      totalLatencyMs: 42,
    }).type).toBe('done');
  });

  it('constructs resource routes without page-owned strings', () => {
    expect(apiRoutes.sessions.exchanges('abc')).toBe('/api/chat/sessions/abc/exchanges');
    expect(apiRoutes.documents.index(7)).toBe('/api/manage/documents/7/index');
  });

  it('validates the standard error envelope', () => {
    expect(ApiErrorEnvelopeSchema.parse({
      error: { code: 'BAD_REQUEST', message: 'invalid', details: null, requestId: 'req_test' },
    }).error.code).toBe('BAD_REQUEST');
  });
});
```

- [ ] **Step 3: Run the contract test and verify failure**

Run:

```bash
pnpm --filter next-ai-backend vitest run test/unit/contracts.test.ts
```

Expected: FAIL because `@next-ai/contracts` does not exist yet.

- [ ] **Step 4: Implement the contracts package**

Use Zod 4 and export inferred types. Required route API:

```ts
export const apiRoutes = {
  auth: {
    login: '/api/admin/auth/login',
    register: '/api/admin/auth/register',
    me: '/api/admin/auth/me',
  },
  chat: '/api/chat',
  sessions: {
    list: '/api/chat/sessions',
    detail: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}`,
    exchanges: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}/exchanges`,
    summary: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}/summary`,
    reset: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}/reset`,
  },
  knowledge: {
    scopes: '/api/manage/knowledge/scopes',
    scope: (scopeCode: string) => `/api/manage/knowledge/scopes/${encodeURIComponent(scopeCode)}`,
    topics: '/api/manage/knowledge/topics',
    topic: (topicCode: string) => `/api/manage/knowledge/topics/${encodeURIComponent(topicCode)}`,
  },
  documents: {
    list: '/api/manage/documents',
    detail: (documentId: number) => `/api/manage/documents/${documentId}`,
    index: (documentId: number) => `/api/manage/documents/${documentId}/index`,
    graph: (documentId: number) => `/api/manage/documents/${documentId}/graph`,
    tasks: (documentId: number) => `/api/manage/documents/${documentId}/tasks`,
  },
  health: { live: '/health/live', ready: '/health/ready' },
} as const;
```

Implement these minimum schemas and inferred types:

- `PaginationQuerySchema`: `page` and `pageSize` via `z.coerce.number().int().positive()`, optional trimmed `keyword`.
- `ApiErrorEnvelopeSchema`: `{ error: { code, message, details, requestId } }`.
- `CredentialsSchema`, `AuthUserSchema`, `AuthResponseSchema`, `MeResponseSchema`.
- `ChatRequestSchema`: optional UUID `conversationId`, non-empty `question`, enum `chatMode`, optional coercible integer `selectedDocumentId`.
- `SessionSchema`, `SessionPageSchema`, `ExchangeSchema`, `MemorySummarySchema`.
- `KnowledgeScopeSchema`, `KnowledgeTopicSchema`, create/update input schemas.
- `DocumentSchema`, `DocumentPageSchema`, `DocumentTaskSchema`, `DocumentGraphSchema`.
- `ChatStreamEventSchema` as a discriminated union of `session`, `token`, `done`, and `error`.

Set `packages/contracts/package.json` scripts to `build: tsc -p tsconfig.json`, `typecheck: tsc --noEmit`, and exports to `dist/index.js` plus `dist/index.d.ts`.

- [ ] **Step 5: Build contracts and rerun tests**

Run:

```bash
pnpm --filter @next-ai/contracts build
pnpm --filter next-ai-backend vitest run test/unit/contracts.test.ts
```

Expected: both commands PASS.

- [ ] **Step 6: Write the failing Express health test**

Create `backend/test/http/health.test.ts`:

```ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

describe('health routes', () => {
  it('returns liveness without touching middleware services', async () => {
    const response = await request(createApp()).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns the request id in errors', async () => {
    const response = await request(createApp()).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.requestId).toMatch(/^req_/);
  });
});
```

- [ ] **Step 7: Run the health test and verify failure**

Run:

```bash
pnpm --filter next-ai-backend vitest run test/http/health.test.ts
```

Expected: FAIL because `createApp` does not exist.

- [ ] **Step 8: Implement Express foundation and build configuration**

Implement the stable composition interface used by every later route test:

```ts
import type { Express, Router } from 'express';

export interface CreateAppOptions {
  readinessProbe?: () => Promise<Record<string, 'up' | 'down'>>;
  featureRouters?: Router[];
}

export function createApp(options: CreateAppOptions = {}): Express;
```

Each feature router exposes a factory (`createAuthRouter(deps)`, `createSessionRouter(deps)`, `createKnowledgeRouter(deps)`, `createDocumentRouter(deps)`, `createChatRouter(deps)`). Production `server.ts` builds those routers with real services; focused tests pass fake-service routers through `featureRouters`, for example `createApp({ featureRouters: [createAuthRouter({ authService: fakeAuthService })] })`. No separate test-app abstraction is introduced.

Use this middleware order:

1. `requestId` using `crypto.randomUUID()` and `res.locals.requestId`.
2. `cors` configured from `CORS_ORIGIN`, default `http://localhost:5173`.
3. `express.json({ limit: '1mb' })`.
4. health router.
5. feature routers added by later tasks.
6. a 404 `AppError('ROUTE_NOT_FOUND', 'Route not found', 404)`.
7. `errorHandler` returning the shared error envelope.

`GET /health/live` returns `{ status: 'ok' }`. `GET /health/ready` accepts an injected readiness probe so tests do not touch real dependencies; default production probe checks PostgreSQL in Task 12.

Add temporary scripts while legacy Next remains:

```json
{
  "dev:express": "tsx watch src/server.ts",
  "build:express": "pnpm --filter @next-ai/contracts build && tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json",
  "start:express": "node dist/src/server.js",
  "test": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

`tsconfig.build.json` must emit CommonJS to `dist`, compile `src` and imported `lib` files, and run through `tsc-alias` so `@/` imports resolve at runtime.

- [ ] **Step 9: Verify foundation**

Run:

```bash
pnpm --filter next-ai-backend vitest run test/unit/contracts.test.ts test/http/health.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
```

Expected: all PASS and `backend/dist/src/server.js` exists.

- [ ] **Step 10: Commit and push foundation**

```bash
git add pnpm-workspace.yaml turbo.json pnpm-lock.yaml packages/contracts backend/package.json backend/tsconfig.build.json backend/vitest.config.ts backend/src backend/test/unit/contracts.test.ts backend/test/http/health.test.ts
git status --short
git commit -m "chore: add Express foundation and shared contracts" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

Expected: only foundation/contract files are committed; the interview checklist remains untracked.

---

### Task 2: Authentication API and Middleware

**Files:**
- Modify: `backend/lib/service/auth/admin.ts`
- Create: `backend/src/http/middleware/auth.ts`
- Create: `backend/src/application/auth/auth.service.ts`
- Create: `backend/src/http/controllers/auth.controller.ts`
- Create: `backend/src/http/routes/auth.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/test/http/auth.test.ts`
- Create: `backend/test/unit/auth-middleware.test.ts`

**Interfaces:**
- Consumes: `CredentialsSchema`, `AuthResponseSchema`, `MeResponseSchema`, `AppError`, `validate()`.
- Produces: `AuthenticatedUser`, `requireAuth`, `requireAdmin`, and the three `/api/admin/auth/*` routes.

- [ ] **Step 1: Write failing authentication tests**

Create Supertest tests with an injected fake auth service:

```ts
const authService = {
  login: async () => ({
    token: 'signed-token',
    user: { userId: 7, username: 'alice', role: 'admin' },
  }),
  register: async () => ({
    token: 'signed-token',
    user: { userId: 7, username: 'alice', role: 'admin' },
  }),
};
const app = createApp({ featureRouters: [createAuthRouter({ authService })] });

it('returns a stable login response', async () => {
  const response = await request(app)
    .post('/api/admin/auth/login')
    .send({ username: 'alice', password: 'secret1' });

  expect(response.status).toBe(200);
  expect(response.body.user.username).toBe('alice');
});

it('rejects a missing bearer token', async () => {
  const response = await request(app).get('/api/admin/auth/me');
  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe('AUTH_REQUIRED');
});
```

Also test invalid credentials (401), short registration password (400), duplicate username (409), valid `/me`, and non-admin rejection by `requireAdmin`.

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm --filter next-ai-backend vitest run test/http/auth.test.ts test/unit/auth-middleware.test.ts
```

Expected: FAIL because Express auth routes and middleware do not exist.

- [ ] **Step 3: Normalize auth service results**

Refactor `adminLogin()` and `adminRegister()` to return the same shape:

```ts
export interface AuthResult {
  token: string;
  user: { userId: number; username: string; role: string };
}
```

Registration must hash the password, create the user, sign a token, and return `AuthResult`; it must not return a raw Prisma row. Preserve first-login default-admin initialization.

- [ ] **Step 4: Implement Express auth middleware and routes**

Define:

```ts
export interface AuthenticatedUser {
  userId: number;
  username: string;
  role: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void;
export function requireAdmin(req: Request, res: Response, next: NextFunction): void;
```

Store the verified user at `res.locals.user`. Mount login/register without auth and `/me` with `requireAuth`. Parse credentials with `CredentialsSchema`. Map duplicate user to `USERNAME_EXISTS`/409 and invalid credentials to `INVALID_CREDENTIALS`/401.

- [ ] **Step 5: Verify authentication module**

```bash
pnpm --filter next-ai-backend vitest run test/http/auth.test.ts test/unit/auth-middleware.test.ts lib/service/auth/jwt.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
```

Expected: PASS. If the legacy JWT file is a script rather than a Vitest suite, run it with `pnpm --filter next-ai-backend exec tsx lib/service/auth/jwt.test.ts` instead of passing it to Vitest.

- [ ] **Step 6: Commit and push auth module**

```bash
git add backend/lib/service/auth/admin.ts backend/src/http/middleware/auth.ts backend/src/application/auth backend/src/http/controllers/auth.controller.ts backend/src/http/routes/auth.routes.ts backend/src/app.ts backend/test/http/auth.test.ts backend/test/unit/auth-middleware.test.ts
git commit -m "feat: migrate authentication API to Express" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 3: Session and Memory Summary API

**Files:**
- Modify: `backend/lib/service/chat/ConversationManager.ts`
- Modify: `backend/lib/service/memory/memoryStore.ts`
- Create: `backend/src/application/sessions/session.service.ts`
- Create: `backend/src/http/controllers/session.controller.ts`
- Create: `backend/src/http/routes/session.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/test/http/sessions.test.ts`
- Create: `backend/test/unit/session-service.test.ts`

**Interfaces:**
- Consumes: authenticated `res.locals.user`, session routes, pagination schemas.
- Produces: list, exchanges, summary, rename, reset, and delete session use cases plus ownership checks used by Chat.

- [ ] **Step 1: Write failing session service tests**

Use a fake repository to test access control and mapping:

```ts
it('prevents a non-admin from reading another user session', async () => {
  const service = createSessionService({
    getSession: async () => ({ conversationId: 'c1', userId: 8 }),
  });

  await expect(service.getExchanges({
    conversationId: 'c1',
    limit: 20,
    user: { userId: 7, username: 'alice', role: 'user' },
  })).rejects.toMatchObject({ code: 'SESSION_FORBIDDEN', status: 403 });
});
```

Test summary returns 404 when no session exists and returns `summary: ''` plus empty arrays when the session exists but has no memory summary.

- [ ] **Step 2: Write failing route tests**

Cover:

```text
GET    /api/chat/sessions?page=1&pageSize=10
GET    /api/chat/sessions/:id/exchanges?limit=50
GET    /api/chat/sessions/:id/summary
PATCH  /api/chat/sessions/:id
POST   /api/chat/sessions/:id/reset
DELETE /api/chat/sessions/:id
```

Verify missing auth is 401, invalid UUID is 400, rename empty title is 400, and successful responses match shared schemas.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm --filter next-ai-backend vitest run test/unit/session-service.test.ts test/http/sessions.test.ts
```

Expected: FAIL because the session module is not implemented.

- [ ] **Step 4: Add ownership-aware ConversationManager operations**

Add repository methods that accept user constraints instead of filtering in controllers:

```ts
listSessions({ keyword, pageNo, pageSize, userId, includeAllUsers })
getSession(conversationId)
getRecentExchanges(conversationId, limit)
renameSession({ conversationId, title })
resetSession({ conversationId })
deleteSession({ conversationId })
```

Keep Prisma mapping in `ConversationManager`; return serializable values only. `MemoryStore.getLatestSummary()` remains the canonical summary reader.

- [ ] **Step 5: Implement session application service and routes**

`SessionService` must call `assertAccess()` before reading or mutating a session. Admin users may access all sessions; regular users may access only `session.userId === user.userId`. Session list supplies `userId` for regular users and no user filter for admins.

Map summary to `MemorySummarySchema` fields exactly:

```ts
{
  conversationId,
  coveredExchangeId,
  compressionCount,
  conversationGoal,
  summary,
  stableFacts,
  pendingQuestions,
  retrievalHints,
  resolvedPoints,
  tokenUsed,
}
```

- [ ] **Step 6: Verify session module**

```bash
pnpm --filter next-ai-backend vitest run test/unit/session-service.test.ts test/http/sessions.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
```

Expected: PASS.

- [ ] **Step 7: Commit and push session module**

```bash
git add backend/lib/service/chat/ConversationManager.ts backend/lib/service/memory/memoryStore.ts backend/src/application/sessions backend/src/http/controllers/session.controller.ts backend/src/http/routes/session.routes.ts backend/src/app.ts backend/test/unit/session-service.test.ts backend/test/http/sessions.test.ts
git commit -m "feat: migrate chat session APIs" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 4: Knowledge Scope and Topic API

**Files:**
- Create: `backend/src/application/knowledge/knowledge.service.ts`
- Create: `backend/src/http/controllers/knowledge.controller.ts`
- Create: `backend/src/http/routes/knowledge.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/test/http/knowledge.test.ts`
- Create: `backend/test/unit/knowledge-service.test.ts`

**Interfaces:**
- Consumes: Prisma knowledge client, knowledge schemas, `requireAdmin`.
- Produces: resource-style scope/topic CRUD routes replacing the mismatched `/list`, `/save`, and `/delete` frontend assumptions.

- [ ] **Step 1: Write failing scope/topic tests**

Test create, list, update, delete, filtering topics by `scopeCode`, duplicate code conflict, missing parent scope handling, and required admin role. Inject a fake knowledge service through `createKnowledgeRouter({ knowledgeService })`. Generate an admin token with the existing `signToken()` helper and send it explicitly:

```ts
const adminToken = signToken({ userId: 1, username: 'admin', role: 'admin' });

it('updates a scope through its resource path', async () => {
  const response = await request(app)
    .patch('/api/manage/knowledge/scopes/hr')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ scopeName: 'Human Resources', description: 'People operations' });

  expect(response.status).toBe(200);
  expect(response.body.scopeCode).toBe('hr');
  expect(response.body.scopeName).toBe('Human Resources');
});
```

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm --filter next-ai-backend vitest run test/unit/knowledge-service.test.ts test/http/knowledge.test.ts
```

Expected: FAIL because knowledge routes do not exist.

- [ ] **Step 3: Implement knowledge service**

Define use cases:

```ts
listScopes()
createScope(input)
updateScope(scopeCode, input)
deleteScope(scopeCode)
listTopics(scopeCode?)
createTopic(input)
updateTopic(topicCode, input)
deleteTopic(topicCode)
```

Use Prisma `create` for POST and `update` for PATCH; do not use POST as an implicit upsert. Translate Prisma unique errors to `KNOWLEDGE_CODE_EXISTS`/409 and missing records to 404.

- [ ] **Step 4: Implement routes and verify**

Mount all routes from the approved contract and protect every route with `requireAdmin`.

Run:

```bash
pnpm --filter next-ai-backend vitest run test/unit/knowledge-service.test.ts test/http/knowledge.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
```

Expected: PASS.

- [ ] **Step 5: Commit and push knowledge module**

```bash
git add backend/src/application/knowledge backend/src/http/controllers/knowledge.controller.ts backend/src/http/routes/knowledge.routes.ts backend/src/app.ts backend/test/unit/knowledge-service.test.ts backend/test/http/knowledge.test.ts
git commit -m "feat: migrate knowledge management APIs" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 5: Document Read and Upload API

**Files:**
- Modify: `backend/src/config/runtime.ts`
- Modify: `backend/lib/service/document/documentRepository.ts`
- Modify: `backend/lib/service/document/storageService.ts`
- Create: `backend/src/application/documents/document-upload.service.ts`
- Create: `backend/src/application/documents/document-query.service.ts`
- Create: `backend/src/http/controllers/document.controller.ts`
- Create: `backend/src/http/routes/document.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/test/unit/document-upload.test.ts`
- Create: `backend/test/http/documents.test.ts`

**Interfaces:**
- Consumes: `producerService.sendParseRoute`, MinIO storage functions, document repository, document contracts, `requireAdmin`.
- Produces: document list/detail/upload routes and `DocumentUploadService.upload()` returning 202 payload.

- [ ] **Step 1: Write failing upload compensation tests**

Create dependency-injected service tests:

```ts
it('removes database rows and the uploaded object when Kafka publish fails', async () => {
  const events: string[] = [];
  const service = createDocumentUploadService({
    uploadFile: async () => { events.push('upload'); return 'it/file.txt'; },
    createDocument: async () => { events.push('document'); return { id: 11, documentName: 'file.txt' }; },
    createTask: async () => { events.push('task'); return { id: 22 }; },
    publishParse: async () => { throw new Error('kafka unavailable'); },
    deleteTask: async () => { events.push('delete-task'); },
    deleteDocument: async () => { events.push('delete-document'); },
    deleteFile: async () => { events.push('delete-file'); },
  });

  await expect(service.upload({
    originalName: 'file.txt',
    mimeType: 'text/plain',
    size: 3,
    buffer: Buffer.from('abc'),
  })).rejects.toMatchObject({ code: 'DOCUMENT_QUEUE_UNAVAILABLE', status: 503 });

  expect(events).toEqual([
    'upload', 'document', 'task', 'delete-task', 'delete-document', 'delete-file',
  ]);
});
```

Also test rejected extension, zero-byte file, and `MAX_UPLOAD_BYTES` enforcement before MinIO is called.

- [ ] **Step 2: Write failing document HTTP tests**

Test:

- GET list defaults `page=1&pageSize=10` and accepts empty keyword.
- GET detail returns 404 for absent document.
- POST multipart field must be named `file`.
- POST returns 202 with `documentId`, `taskId`, and statuses.
- Every document route rejects non-admin users.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm --filter next-ai-backend vitest run test/unit/document-upload.test.ts test/http/documents.test.ts
```

Expected: FAIL because document Express services/routes do not exist.

- [ ] **Step 4: Implement query and upload services**

Set `MAX_UPLOAD_BYTES` default to `20 * 1024 * 1024`. Configure Multer `memoryStorage`, one file, and the same max. Validate extension through `detectFormat()` and preserve current MinIO/Prisma/Kafka behavior.

Perform compensation in reverse creation order and aggregate compensation failures into server logs while returning the primary `DOCUMENT_QUEUE_UNAVAILABLE` error.

Update `documentRepository.list()` to accept an optional keyword and return serializable `fileSize` values for every row.

- [ ] **Step 5: Verify document read/upload module**

```bash
pnpm --filter next-ai-backend vitest run test/unit/document-upload.test.ts test/http/documents.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
```

Expected: PASS.

- [ ] **Step 6: Commit and push document read/upload module**

```bash
git add backend/src/config/runtime.ts backend/lib/service/document/documentRepository.ts backend/lib/service/document/storageService.ts backend/src/application/documents backend/src/http/controllers/document.controller.ts backend/src/http/routes/document.routes.ts backend/src/app.ts backend/test/unit/document-upload.test.ts backend/test/http/documents.test.ts
git commit -m "feat: migrate document upload and query APIs" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 6: Document Tasks, Graph, Index, and Delete Lifecycle

**Files:**
- Modify: `backend/lib/models/enum.ts`
- Modify: `backend/lib/service/document/documentRepository.ts`
- Modify: `backend/lib/service/document/keywordService.ts`
- Modify: `backend/lib/service/document/vectorGatway.ts`
- Create: `backend/src/application/documents/document-lifecycle.service.ts`
- Modify: `backend/src/http/controllers/document.controller.ts`
- Modify: `backend/src/http/routes/document.routes.ts`
- Create: `backend/test/unit/document-delete.test.ts`
- Create: `backend/test/http/document-lifecycle.test.ts`

**Interfaces:**
- Consumes: document detail, Prisma knowledge models, MinIO, ES, pgvector, indexing processor.
- Produces: tasks, graph, manual index, and retryable delete routes.

- [ ] **Step 1: Write failing delete-order and retry tests**

Test that deletion:

1. Marks the document `DELETING` before external cleanup.
2. Deletes ES and pgvector entries only for the selected document.
3. Deletes original and parsed MinIO objects when present.
4. Deletes `DocumentChunk` explicitly because it lacks a Prisma relation.
5. Uses a database transaction for related Prisma rows.
6. Leaves a failed status and error message when an external cleanup fails.

Representative assertion:

```ts
expect(events).toEqual([
  'mark-deleting',
  'delete-es',
  'delete-vectors',
  'delete-original',
  'delete-parsed',
  'delete-database-records',
]);
```

- [ ] **Step 2: Write failing route tests**

Cover:

```text
GET  /api/manage/documents/:documentId/tasks
GET  /api/manage/documents/:documentId/graph
POST /api/manage/documents/:documentId/index
DELETE /api/manage/documents/:documentId
```

Graph response must create one node per `DocumentStructureNode` and one edge only when `parentNodeId` is populated. A document with no parent links returns nodes with an empty edge array rather than inventing hierarchy.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm --filter next-ai-backend vitest run test/unit/document-delete.test.ts test/http/document-lifecycle.test.ts
```

Expected: FAIL because lifecycle methods are absent.

- [ ] **Step 4: Implement lifecycle service and storage-specific deletion**

Add:

```ts
export async function deleteDocumentChunksFromEs(documentId: number): Promise<void>;
export async function deleteDocumentVectors(documentId: number): Promise<void>;
```

The ES implementation uses `deleteByQuery` filtered by `documentId`. The pgvector implementation executes `DELETE FROM document_chunk WHERE document_id = $1`.

Use explicit document status constants in `enum.ts`; do not overload parse/index status values. Persist delete failures in an existing error-capable field (`parseErrorMsg`) only if no dedicated field exists; include prefix `[DELETE]` so the state is diagnosable without a schema migration.

Manual index route creates a task and invokes the existing `indexingProcessor.buildIndex()` synchronously for compatibility in phase one. Return the result and task ID; Kafka-based index scheduling remains available to the worker pipeline.

- [ ] **Step 5: Verify lifecycle module**

```bash
pnpm --filter next-ai-backend vitest run test/unit/document-delete.test.ts test/http/document-lifecycle.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
```

Expected: PASS.

- [ ] **Step 6: Commit and push lifecycle module**

```bash
git add backend/lib/models/enum.ts backend/lib/service/document/documentRepository.ts backend/lib/service/document/keywordService.ts backend/lib/service/document/vectorGatway.ts backend/src/application/documents/document-lifecycle.service.ts backend/src/http/controllers/document.controller.ts backend/src/http/routes/document.routes.ts backend/test/unit/document-delete.test.ts backend/test/http/document-lifecycle.test.ts
git commit -m "feat: add document lifecycle APIs" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 7: Framework-Neutral Chat Orchestration and Express SSE

**Files:**
- Modify: `backend/lib/models/enum.ts`
- Modify: `backend/lib/service/chat/ConversationManager.ts`
- Modify: `backend/lib/service/chat/preparationOrchestrator.ts`
- Create: `backend/src/application/chat/chat-orchestrator.ts`
- Create: `backend/src/application/chat/chat-dependencies.ts`
- Create: `backend/src/http/controllers/chat.controller.ts`
- Create: `backend/src/http/routes/chat.routes.ts`
- Create: `backend/src/http/sse/write-event.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/test/unit/chat-orchestrator.test.ts`
- Create: `backend/test/unit/sse-writer.test.ts`
- Create: `backend/test/http/chat-sse.test.ts`

**Interfaces:**
- Consumes: current `streamChatCompletion`, `createAgent`, `retrieve`, memory services, and conversation manager.
- Produces: `runChat(input, callbacks, signal)` and POST `/api/chat` with stable SSE events.

- [ ] **Step 1: Write failing orchestration tests**

Define the public interface in the test:

```ts
interface ChatCallbacks {
  onSession(event: { conversationId: string; exchangeId: number }): void;
  onToken(content: string): void;
}

interface ChatRunResult {
  conversationId: string;
  exchangeId: number;
  firstTokenLatencyMs?: number;
  totalLatencyMs: number;
}
```

Test these invariants:

- exactly one Exchange is created;
- `prepareExecutionPlan` no longer creates an Exchange;
- RAG retrieval is called only for `RAG_CHAT`;
- Agent is called only for `REACT_AGENT`;
- completion persists before `done` is returned;
- failure/cancel sets Exchange state and Session IDLE;
- an already aborted signal prevents model invocation;
- first-token latency starts at the first non-empty token.

- [ ] **Step 2: Write failing SSE tests**

`writeSseEvent(res, event)` must produce exactly:

```text
data: {json}\n\n
```

The HTTP test injects a fake `runChat` that sends `session`, two tokens, and completion. Assert event order and that `done` appears once. Inject a throwing runner and assert one `error` event and no `done`.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm --filter next-ai-backend vitest run test/unit/chat-orchestrator.test.ts test/unit/sse-writer.test.ts test/http/chat-sse.test.ts
```

Expected: FAIL because the orchestrator and SSE route do not exist.

- [ ] **Step 4: Make plan preparation read-only**

Refactor `prepareExecutionPlan()` so it may read session memory, rewrite the query, and route knowledge but must not create a Session or Exchange. Remove `exchangeId` generation and `createExchange()` from this function.

- [ ] **Step 5: Add atomic exchange start operation**

Add:

```ts
conversationManager.startExchange({
  conversationId,
  chatMode,
  question,
  userId,
}): Promise<{ exchangeId: number }>;
```

Inside one Prisma transaction:

1. upsert the Session;
2. acquire a PostgreSQL transaction advisory lock based on `conversationId`;
3. calculate the next exchange ID;
4. create the STARTED Exchange;
5. set Session ACTIVE.

Use the existing unique constraint `[conversationId, exchangeId]` as the final guard and retry a unique conflict once.

- [ ] **Step 6: Implement ChatOrchestrator**

Production flow:

```text
validate access/input
→ ensure/read session context
→ prepare read-only execution plan
→ start one exchange
→ callback onSession
→ execute Agent or RAG branch
→ callback onToken for non-empty chunks
→ complete exchange
→ set session IDLE
→ schedule memory compression
→ return latency result
```

For phase one, preserve `streamChatCompletion()` for the RAG branch and preserve LangGraph for the Agent branch. Do not migrate model SDKs here.

Add `ExchangeState.CANCELLED = 4`. Cancellation is detected from `AbortSignal`; do not send an SSE error after the socket has closed, but do persist CANCELLED and restore Session IDLE.

- [ ] **Step 7: Implement Express SSE controller**

Set headers:

```ts
res.status(200);
res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');
res.flushHeaders();
```

Start a 15-second comment heartbeat. Attach `req.on('close')` to abort the controller. Clear heartbeat in `finally`. Send `done` only after `runChat()` resolves. Send `error` only if the response is still writable.

- [ ] **Step 8: Verify chat module**

```bash
pnpm --filter next-ai-backend vitest run test/unit/chat-orchestrator.test.ts test/unit/sse-writer.test.ts test/http/chat-sse.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
```

Expected: PASS.

- [ ] **Step 9: Commit and push chat module**

```bash
git add backend/lib/models/enum.ts backend/lib/service/chat/ConversationManager.ts backend/lib/service/chat/preparationOrchestrator.ts backend/src/application/chat backend/src/http/controllers/chat.controller.ts backend/src/http/routes/chat.routes.ts backend/src/http/sse backend/src/app.ts backend/test/unit/chat-orchestrator.test.ts backend/test/unit/sse-writer.test.ts backend/test/http/chat-sse.test.ts
git commit -m "feat: migrate chat orchestration and SSE streaming" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 8: Independent Kafka Document Worker

**Files:**
- Modify: `backend/lib/config.ts`
- Modify: `backend/lib/db/kafka.ts`
- Modify: `backend/lib/services/document/AsyncProcessor.ts`
- Create: `backend/src/workers/document.worker.ts`
- Create: `backend/src/lifecycle/close-resources.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/test/unit/kafka-groups.test.ts`
- Create: `backend/test/unit/async-processor.test.ts`

**Interfaces:**
- Consumes: existing ParserProcessor, IndexingProcessor, ProducerService.
- Produces: standalone worker process, shared parse/index group IDs, idempotent message handlers, and graceful resource close functions.

- [ ] **Step 1: Write failing consumer group tests**

Test four consumers share one parse group and one index group:

```ts
expect(createdGroups.filter((group) => group.endsWith('-parse'))).toEqual([
  'super-agent-group-parse',
  'super-agent-group-parse',
  'super-agent-group-parse',
  'super-agent-group-parse',
]);
```

Test completed tasks skip processors, failed handlers increment retry count, and exhausted retries mark task/document failure without republishing.

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm --filter next-ai-backend vitest run test/unit/kafka-groups.test.ts test/unit/async-processor.test.ts
```

Expected: FAIL because group IDs currently include a consumer index and handlers are not dependency-injected.

- [ ] **Step 3: Add explicit worker configuration**

Extend `config.kafka` with:

```ts
consumerCount: envNum('KAFKA_CONSUMER_COUNT', 1)
```

Use group IDs `${groupId}-parse` and `${groupId}-index` for all same-topic consumers. Keep parse and index as different groups.

- [ ] **Step 4: Refactor AsyncProcessor for idempotency and tests**

Before processing:

- retrieve task;
- return immediately when `taskStatus === 2`;
- accept only pending/running/retryable states;
- update to running atomically;
- execute processor;
- update to completed;
- retry at most three times.

Inject Kafka creation, Prisma, parser, indexer, and producer dependencies into the constructor, with production defaults in the exported singleton.

- [ ] **Step 5: Implement worker entry and graceful shutdown**

`document.worker.ts` loads dotenv, starts `asyncProcessor`, and handles `SIGINT`/`SIGTERM`. `server.ts` must not import `AsyncProcessor`.

Add scripts:

```json
{
  "dev:worker": "tsx watch src/workers/document.worker.ts",
  "start:worker": "node dist/src/workers/document.worker.js"
}
```

Build output must include both server and worker.

- [ ] **Step 6: Verify worker independence**

Run:

```bash
pnpm --filter next-ai-backend vitest run test/unit/kafka-groups.test.ts test/unit/async-processor.test.ts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
node -e "const fs=require('fs'); if(!fs.existsSync('backend/dist/src/workers/document.worker.js')) process.exit(1)"
```

Expected: PASS and worker build exists. Inspect `backend/dist/src/server.js` to ensure it contains no `asyncProcessor.start` call.

- [ ] **Step 7: Commit and push worker module**

```bash
git add backend/lib/config.ts backend/lib/db/kafka.ts backend/lib/services/document/AsyncProcessor.ts backend/src/workers/document.worker.ts backend/src/lifecycle/close-resources.ts backend/src/server.ts backend/package.json backend/test/unit/kafka-groups.test.ts backend/test/unit/async-processor.test.ts
git commit -m "feat: split document processing into Kafka worker" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 9: Frontend Contract-Backed API Clients

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/lib/client.ts`
- Modify: `frontend/lib/auth.ts`
- Modify: `frontend/lib/chat.ts`
- Modify: `frontend/lib/admin.ts`
- Modify: `frontend/next.config.js`
- Create: `frontend/lib/client.test.ts`
- Create: `frontend/lib/api-routes.test.ts`

**Interfaces:**
- Consumes: `@next-ai/contracts` route builders and schemas.
- Produces: one typed REST client and feature clients with no obsolete path strings.

- [ ] **Step 1: Add frontend contracts and test dependencies**

```bash
pnpm --filter next-ai-frontend add @next-ai/contracts@workspace:*
pnpm --filter next-ai-frontend add -D vitest
```

Add scripts `test: vitest run` and `typecheck: tsc --noEmit`.

- [ ] **Step 2: Write failing client tests**

Mock `global.fetch` and verify:

- success responses are parsed with the supplied Zod schema;
- the bearer token is added when present;
- 204 responses return `undefined` without JSON parsing;
- standard error envelopes throw an `ApiClientError` with code/status/requestId;
- non-standard server errors become `HTTP_ERROR`.

Route tests must verify every feature method calls an `apiRoutes` value and no obsolete `/list`, `/save`, or `/delete` path remains.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm --filter next-ai-frontend test -- lib/client.test.ts lib/api-routes.test.ts
```

Expected: FAIL because the current clients hardcode old URLs and return shapes.

- [ ] **Step 4: Implement typed client and feature APIs**

Expose:

```ts
request<T>({ url, method, body, headers, schema, signal }): Promise<T>
```

Do not set `Content-Type` for `FormData`. Use shared schemas for responses. Normalize auth state to `AuthResponse` (`token` plus nested `user`).

Update clients to exact resource routes and methods:

- Session rename uses PATCH body `{ title }`.
- Session delete uses DELETE.
- Scope/topic create uses POST; update uses PATCH; delete uses DELETE.
- Document upload/list/detail/delete/index/graph/tasks use document routes.

Update `frontend/next.config.js` to use:

```js
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:3000';
```

Only `/api/:path*` needs a rewrite. Remove `/admin` and `/manage` page rewrites because they are frontend routes, not backend APIs.

- [ ] **Step 5: Verify frontend clients**

```bash
pnpm --filter next-ai-frontend test -- lib/client.test.ts lib/api-routes.test.ts
pnpm --filter next-ai-frontend typecheck
pnpm --filter next-ai-frontend build
```

Expected: PASS.

- [ ] **Step 6: Commit and push frontend client module**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/lib/client.ts frontend/lib/auth.ts frontend/lib/chat.ts frontend/lib/admin.ts frontend/next.config.js frontend/lib/client.test.ts frontend/lib/api-routes.test.ts pnpm-lock.yaml
git commit -m "feat: align frontend clients with Express contracts" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 10: Chunk-Safe Frontend SSE and Chat Page State

**Files:**
- Create: `frontend/lib/sse-parser.ts`
- Create: `frontend/lib/sse-parser.test.ts`
- Create: `frontend/lib/chat-stream.ts`
- Create: `frontend/lib/chat-stream.test.ts`
- Modify: `frontend/app/chat/page.tsx`
- Modify: `frontend/components/chat/SessionList.tsx`

**Interfaces:**
- Consumes: `ChatStreamEventSchema`, `apiRoutes.chat`, auth token, session API.
- Produces: `SseFrameParser`, `streamChat()`, cancellation, and explicit chat UI states.

- [ ] **Step 1: Write failing SSE parser tests**

Test one JSON event split across chunks:

```ts
it('retains an incomplete frame across network chunks', () => {
  const parser = new SseFrameParser();
  expect(parser.push('data: {"type":"token","cont')).toEqual([]);
  expect(parser.push('ent":"你"}\n\n')).toEqual([{ type: 'token', content: '你' }]);
});
```

Also test multiple frames in one chunk, CRLF, heartbeat comments, malformed complete JSON producing a typed parse error, and final buffer flush.

- [ ] **Step 2: Write failing stream client tests**

Mock a `ReadableStream<Uint8Array>` that emits split frames. Assert callback order, bearer token, request body including `chatMode`, and cancellation propagation through `AbortSignal`.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm --filter next-ai-frontend test -- lib/sse-parser.test.ts lib/chat-stream.test.ts
```

Expected: FAIL because parser and stream client do not exist.

- [ ] **Step 4: Implement parser and `streamChat()`**

`SseFrameParser` keeps a string buffer, normalizes `\r\n` to `\n`, splits only on full `\n\n` boundaries, ignores lines beginning with `:`, joins multiple `data:` lines with `\n`, parses JSON, then validates via `ChatStreamEventSchema`.

`streamChat()` performs POST fetch and yields events or invokes an `onEvent` callback. It throws `ApiClientError` for a non-2xx pre-stream response and stops cleanly on abort.

- [ ] **Step 5: Rewrite chat page around explicit state**

Replace `sending: boolean` with:

```ts
type ChatPhase = 'idle' | 'submitting' | 'streaming' | 'completed' | 'failed' | 'cancelled';
```

Rules:

- append the user message immediately;
- on `session`, set conversation/exchange IDs;
- on `token`, append to one assistant draft;
- on `done`, finalize assistant message and refresh sessions;
- on `error`, show the server message and mark failed;
- cancel button aborts the current controller and marks cancelled;
- starting a new session aborts an active stream;
- unmount aborts an active stream;
- include selected `chatMode` in request.

Update `SessionList` to consume the new summary property names and resource clients.

- [ ] **Step 6: Verify chat frontend**

```bash
pnpm --filter next-ai-frontend test -- lib/sse-parser.test.ts lib/chat-stream.test.ts
pnpm --filter next-ai-frontend typecheck
pnpm --filter next-ai-frontend build
```

Expected: PASS.

- [ ] **Step 7: Commit and push chat frontend**

```bash
git add frontend/lib/sse-parser.ts frontend/lib/sse-parser.test.ts frontend/lib/chat-stream.ts frontend/lib/chat-stream.test.ts frontend/app/chat/page.tsx frontend/components/chat/SessionList.tsx
git commit -m "feat: rebuild chat streaming state and SSE parsing" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 11: Administration Page and Virtual-Request Cleanup

**Files:**
- Modify: `frontend/app/admin/page.tsx`
- Modify: `frontend/app/page.tsx`
- Create: `scripts/check-api-literals.mjs`
- Modify: `package.json`
- Create: `frontend/lib/admin-page-model.test.ts`

**Interfaces:**
- Consumes: implemented document and knowledge clients only.
- Produces: working upload/list/delete/index/scope/topic interactions and a repository guard against page-owned API strings.

- [ ] **Step 1: Write failing frontend model/guard tests**

Extract pure status/action helpers from the admin page where needed. Test that build-index calls the real client and refreshes documents after success. Test that edit creates PATCH while new creates POST through the client API.

Create `scripts/check-api-literals.mjs` to scan tracked source files under `frontend/app` and `frontend/components` for string literals containing `/api/`. The script prints each file/line and exits 1 when any are found.

- [ ] **Step 2: Run checks and verify failure**

```bash
pnpm --filter next-ai-frontend test -- lib/admin-page-model.test.ts
node scripts/check-api-literals.mjs
```

Expected: FAIL because the admin build-index handler is a placeholder and the chat page/client migration may still expose literals if Task 10 missed any.

- [ ] **Step 3: Wire every visible admin action to a real API**

Implement:

- upload and 202 task feedback;
- document refresh;
- document delete;
- manual index build using `adminApi.buildDocumentIndex()`;
- scope create/update/delete;
- topic create/update/delete;
- task/parse/index error display from real document fields.

Do not add a graph button unless the page renders graph data. The backend graph endpoint remains tested and available, but unused clients must not imply a visible feature.

Fix authentication redirects to `/`, because no `/login` page exists. Fix the password input to `type="password"` and correct the invalid `focus:ring-blue-5000/20` Tailwind class.

- [ ] **Step 4: Add root API audit script**

Add:

```json
{
  "scripts": {
    "check:api-contracts": "node scripts/check-api-literals.mjs"
  }
}
```

The scan excludes `frontend/lib` and `packages/contracts`, where route definitions legitimately live.

- [ ] **Step 5: Verify administration and API audit**

```bash
pnpm --filter next-ai-frontend test -- lib/admin-page-model.test.ts
node scripts/check-api-literals.mjs
pnpm --filter next-ai-frontend typecheck
pnpm --filter next-ai-frontend build
```

Expected: PASS and the literal scan prints `No page-owned API literals found`.

- [ ] **Step 6: Commit and push administration cleanup**

```bash
git add frontend/app/admin/page.tsx frontend/app/page.tsx frontend/lib/admin-page-model.test.ts scripts/check-api-literals.mjs package.json
git commit -m "feat: align administration pages with implemented APIs" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

---

### Task 12: Real Middleware Integration, Cutover, and Legacy Next Backend Removal

**Files:**
- Modify: `backend/lib/db/prisma-business.ts`
- Modify: `backend/lib/db/prisma-knowledge.ts`
- Modify: `backend/lib/db/redis.ts`
- Modify: `backend/lib/db/pgvector.ts`
- Modify: `backend/lib/db/elasticsearch.ts`
- Modify: `backend/lib/ai/client.ts`
- Modify: `backend/src/lifecycle/close-resources.ts`
- Modify: `backend/src/http/routes/health.routes.ts`
- Create: `backend/test/integration/middleware.integration.test.ts`
- Create: `backend/test/integration/express.integration.test.ts`
- Create: `backend/test/integration/kafka.integration.test.ts`
- Modify: `backend/package.json`
- Modify: `backend/tsconfig.json`
- Modify: `turbo.json`
- Delete: `backend/app/api/**/route.ts`
- Delete: `backend/instrumentation.ts`
- Delete: `backend/next.config.js`
- Delete: `backend/next-env.d.ts`
- Create: `docs/superpowers/checkpoints/2026-08-17-express-phase-one.md`

**Interfaces:**
- Consumes: every prior module and running middleware services.
- Produces: Express as the only backend runtime, verified real dependencies, independent worker startup, and a phase-one recovery checkpoint.

- [ ] **Step 1: Add explicit health and close functions**

Expose these functions:

```ts
disconnectBusinessPrisma(): Promise<void>
disconnectKnowledgePrisma(): Promise<void>
disconnectRedis(): Promise<void>
closePgVectorPool(): Promise<void>
closeElasticsearch(): Promise<void>
closeAiHttpAgents(): void
```

`closeResources()` calls each once, uses `Promise.allSettled`, logs failures, and never prevents the process from attempting remaining closes.

`/health/ready` executes lightweight probes with per-probe timeouts and returns:

```json
{
  "status": "ready",
  "dependencies": {
    "businessDb": "up",
    "knowledgeDb": "up",
    "redis": "up",
    "kafkaProducer": "up"
  }
}
```

Core database failure makes HTTP status 503 and `status: "not_ready"`; optional dependency failure remains visible but does not automatically fail readiness unless the dependency is required for the requested deployment profile.

- [ ] **Step 2: Write opt-in real middleware tests**

Gate the suite with `RUN_INTEGRATION=1`. Test resources must use `it_${Date.now()}_${crypto.randomUUID()}`.

`middleware.integration.test.ts`:

- `SELECT 1` through both Prisma clients;
- Redis set/get/delete unique key;
- MinIO put/get/remove unique object;
- Elasticsearch create/delete one unique test index;
- pgvector `SELECT extversion FROM pg_extension WHERE extname = 'vector'`.

`kafka.integration.test.ts`:

- create a unique test topic;
- producer sends one unique message;
- consumer in a unique group receives exactly once;
- disconnect producer/consumer;
- delete only the unique test topic created by this test in `finally`.

`express.integration.test.ts`:

- register a unique user and receive token;
- `/me` succeeds;
- create/list/update/delete a unique knowledge scope/topic;
- upload a tiny unique `.txt` file;
- verify 202 and task record;
- clean only the created document/task/object/index entries in `finally`.

- [ ] **Step 3: Run non-integration full verification first**

```bash
pnpm --filter @next-ai/contracts build
pnpm --filter next-ai-backend test
pnpm --filter next-ai-frontend test
pnpm check:api-contracts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-frontend typecheck
pnpm --filter next-ai-backend build:express
pnpm --filter next-ai-frontend build
```

Expected: all PASS before touching real middleware.

- [ ] **Step 4: Run real middleware integration tests**

From repository root, load the existing backend environment and run:

```bash
RUN_INTEGRATION=1 pnpm --filter next-ai-backend vitest run test/integration
```

Expected: PASS. On Windows Git Bash, the inline environment assignment is valid. Verify the test output confirms cleanup for every created external resource.

- [ ] **Step 5: Perform manual process smoke tests**

In separate terminals:

```bash
pnpm --filter next-ai-backend dev:express
pnpm --filter next-ai-backend dev:worker
pnpm --filter next-ai-frontend dev
```

Verify:

1. login/register;
2. session list/actions;
3. one chat SSE completion and one cancellation;
4. document upload reaches a worker task;
5. knowledge scope/topic CRUD;
6. API process restart does not start additional consumers;
7. worker restart resumes consumption;
8. shutdown logs show resource closure.

Record exact observed results in the checkpoint file; do not write “passed” for a skipped action.

- [ ] **Step 6: Switch backend package to Express-only runtime**

Change backend scripts to:

```json
{
  "dev": "tsx watch src/server.ts",
  "dev:worker": "tsx watch src/workers/document.worker.ts",
  "build": "pnpm --filter @next-ai/contracts build && tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json",
  "start": "node dist/src/server.js",
  "start:worker": "node dist/src/workers/document.worker.js",
  "test": "vitest run",
  "test:integration": "vitest run test/integration",
  "typecheck": "tsc --noEmit"
}
```

Remove backend dependencies `next`, `react`, and `react-dom`, plus React type dev dependencies. Remove Next plugin/JSX/`.next` includes from backend tsconfig. Delete legacy Next route/runtime files listed above.

Update `turbo.json` build outputs to include both `.next/**` and `dist/**` so frontend and backend outputs are cached correctly.

- [ ] **Step 7: Run final post-removal verification**

```bash
pnpm install
pnpm --filter @next-ai/contracts build
pnpm --filter next-ai-backend test
pnpm --filter next-ai-frontend test
pnpm check:api-contracts
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-frontend typecheck
pnpm build
```

Expected: all PASS. Search for backend Next runtime imports:

```bash
rg "next/server|NextRequest|NextResponse" backend --glob '!node_modules/**' --glob '!.next/**'
```

Expected: no output.

Search frontend API literals:

```bash
node scripts/check-api-literals.mjs
```

Expected: `No page-owned API literals found`.

- [ ] **Step 8: Write the phase-one checkpoint**

Populate `docs/superpowers/checkpoints/2026-08-17-express-phase-one.md` with factual output from:

```bash
git log --oneline main..HEAD
git status --short --branch
pnpm --filter next-ai-backend run
pnpm --filter next-ai-frontend run
```

The checkpoint must contain:

- final directory and process boundaries;
- complete Express route list;
- API/worker/frontend commands;
- required environment variables;
- middleware integration results;
- SSE completion and cancellation results;
- fixed legacy defects;
- commit list and remote branch;
- skipped or blocked checks;
- remaining risks;
- second-phase entry files (`backend/lib/ai/client.ts`, `backend/lib/ai/chatModel.ts`, query rewrite, memory summary, embedding, Chat Orchestrator, LangGraph nodes).

Do not start LangChain migration in this task.

- [ ] **Step 9: Commit and push final cutover**

```bash
git add backend frontend/next.config.js packages/contracts package.json pnpm-lock.yaml turbo.json scripts docs/superpowers/checkpoints/2026-08-17-express-phase-one.md
git status --short
git commit -m "chore: complete Express backend cutover" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push next-ai feat/express-backend-migration
```

Expected: push succeeds; the only remaining untracked file is the pre-existing interview checklist if the user has not handled it separately.

- [ ] **Step 10: Stop at the phase boundary**

Report the checkpoint, test evidence, branch, and commits. Do not create `feat/langchain-provider-unification` until the user reviews phase one. The second phase requires a new design check against the actual post-Express code and its own implementation plan.
