# Task 4 — Knowledge Scope and Topic API Report

## Status

Complete. Implemented admin-only Express resource APIs for knowledge scopes and topics, using explicit POST-create, PATCH-update, and DELETE-resource semantics.

## RED

Command:

```text
pnpm --filter next-ai-backend vitest run test/unit/knowledge-service.test.ts test/http/knowledge.test.ts
```

Initial result: FAIL as intended. Both new test suites could not resolve the not-yet-created knowledge service and router modules.

```text
Cannot find module '../../src/application/knowledge/knowledge.service'
Cannot find module '../../src/http/routes/knowledge.routes'
```

## GREEN

Final focused verification:

```text
pnpm --filter @next-ai/contracts build
pnpm --filter next-ai-backend vitest run test/unit/knowledge-service.test.ts test/http/knowledge.test.ts test/unit/contracts.test.ts
```

Result: PASS — 3 test files, 24 tests.

```text
pnpm --filter next-ai-backend typecheck
pnpm --filter next-ai-backend build:express
pnpm --filter @next-ai/contracts typecheck
```

Result: all PASS.

Prisma client generation was run before backend typecheck/build because this worktree did not initially contain generated `.prisma-business` and `.prisma-knowledge` clients:

```text
pnpm --filter next-ai-backend exec prisma generate --config prisma-knowledge.config.ts
pnpm --filter next-ai-backend exec prisma generate --config prisma-business.config.ts
```

## Files

- `backend/src/application/knowledge/knowledge.service.ts`
  - Scope/topic application service and Prisma repository adapter.
  - Maps Prisma unique violations to `KNOWLEDGE_CODE_EXISTS` (409) and missing records to clear scope/topic 404 errors.
  - Validates a topic's parent scope before creates and re-scopes; validates topic existence before updates.
  - Prevents deleting a scope with extant topics (`KNOWLEDGE_SCOPE_IN_USE`, 409) because the database schema has no FK.
- `backend/src/http/controllers/knowledge.controller.ts`
- `backend/src/http/routes/knowledge.routes.ts`
  - Resource routes under `/api/manage/knowledge`, all protected by `requireAuth` followed by `requireAdmin`.
- `backend/src/server.ts`
  - Mounts the knowledge router in the Express server.
- `packages/contracts/src/knowledge.ts`
  - Added reusable params/query schemas and non-empty PATCH validation; allows topic PATCH to change `scopeCode` so service-level parent validation is reachable.
- `backend/test/unit/knowledge-service.test.ts`
- `backend/test/http/knowledge.test.ts`
- `backend/test/unit/contracts.test.ts`

## API

- `GET /api/manage/knowledge/scopes`
- `POST /api/manage/knowledge/scopes`
- `PATCH /api/manage/knowledge/scopes/:scopeCode`
- `DELETE /api/manage/knowledge/scopes/:scopeCode`
- `GET /api/manage/knowledge/topics?scopeCode=:scopeCode`
- `POST /api/manage/knowledge/topics`
- `PATCH /api/manage/knowledge/topics/:topicCode`
- `DELETE /api/manage/knowledge/topics/:topicCode`

## Self-review

- No frontend or legacy Next API routes were changed.
- POST code paths call Prisma `create`; PATCH paths call `update`; no upsert is used.
- Error responses use application errors only and never expose Prisma error objects.
- Shared contract schemas are used for route params, topic filtering query, and request bodies; contracts are unit tested.
- HTTP tests use explicit signed admin/user tokens and injected service instances.

## Commit and push

Implementation commit created:

```text
05afce3 feat: migrate knowledge management APIs
```

The report is committed separately after this update. Push result will be appended after the requested push completes.

## Concerns

- Scope/topic codes are globally unique independently in their respective tables. The common `KNOWLEDGE_CODE_EXISTS` 409 does not distinguish a scope from a topic conflict, by design.
- Scope deletion integrity is application-enforced (topic lookup plus delete) because the schema has no FK; concurrent external writes could still race this check. A future schema FK/transactional constraint would make this invariant database-enforced.
