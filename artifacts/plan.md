# WAY Auth Service Implementation Plan

## Goal
Build `WAY Auth` as a standalone authentication microservice with secure email/password auth, JWT access tokens, refresh-token sessions, and a public JWKS endpoint, following the PRD and modern Next.js + Prisma + Neon + Upstash best practices.

## Constraints
- Keep scope to PRD v1 only (no OAuth, social login, MFA, magic links, or UI pages).
- API-first service (`/v1/signup`, `/v1/login`, `/v1/refresh`, `/v1/logout`, `/v1/jwks`).
- Security-first defaults (password hashing, refresh token hashing + rotation, HttpOnly cookies, CORS, rate limiting).
- Incremental delivery with checkable milestones.
- Do not run setup/init commands automatically; run them manually in terminal.
- Use Bun commands for local workflow.

## Phase 0: Manual Setup (run these commands yourself)
Purpose: initialize project and install required dependencies.

```bash
bunx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*"
bun add @prisma/client jose argon2 @upstash/redis @upstash/ratelimit zod
bun add -d prisma @types/node
bunx prisma init
```

After that, create/update `.env.local` with:
- `DATABASE_URL`
- `DIRECT_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `JWT_PRIVATE_KEY` (PEM)
- `JWT_PUBLIC_KEY` (PEM)
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `REFRESH_COOKIE_NAME`

Then generate Prisma artifacts:

```bash
bunx prisma migrate dev --name init
bunx prisma generate
```

Success criteria:
- Next.js app scaffold exists in this repo.
- Dependencies installed.
- Prisma initialized and migration applied.

## Phase 1: Foundation & Project Structure
Steps:
1. Set up folder structure by intent:
   - `src/app/api/v1/...` for route handlers
   - `src/server/auth/...` for domain logic
   - `src/server/db/...` for Prisma client
   - `src/server/security/...` for crypto/cookies/rate-limit helpers
   - `src/lib/...` for shared utilities/schemas
2. Add base config:
   - strict TypeScript checks
   - environment validation (zod)
   - lint/typecheck scripts
3. Add initial docs:
   - local dev notes
   - env var reference

Success criteria:
- Clean structure exists with clear server boundaries.
- Env validation fails fast for missing secrets.
- `bun run typecheck` passes.

## Phase 2: Data Model & Persistence
Steps:
1. Define Prisma schema for:
   - `User` (id, email unique, passwordHash, createdAt, updatedAt)
   - `Session` (id/jti, userId, refreshTokenHash, expiresAt, revokedAt, createdAt, replacedBySessionId)
2. Add indexes and uniqueness constraints for lookup performance and integrity.
3. Create migration and regenerate client.
4. Add repository-style server functions (create user, find user by email, create session, rotate/revoke session).

Success criteria:
- Schema enforces uniqueness/integrity.
- Session rotation fields support revocation chains.
- Type-safe DB access layer compiles.

## Phase 3: Auth Domain Logic
Steps:
1. Implement password hashing + verification (`argon2id` preferred).
2. Implement JWT signing + verification (`RS256`) with claims:
   - `sub` (user id), `iss`, `aud`, `exp`, `iat`, `jti`
3. Implement refresh token generation, hashing, rotation, and replay protection.
4. Implement cookie helpers for secure refresh cookies:
   - `HttpOnly`, `Secure`, `SameSite`, path scoping, max-age
5. Implement input validation schemas (signup/login/refresh/logout).

Success criteria:
- Tokens and session rotation behavior are deterministic and testable.
- Replay attempts on rotated/revoked refresh tokens are denied.
- All domain logic is isolated from route handlers.

## Phase 4: API Routes (`/v1/*`)
Steps:
1. `POST /v1/signup`
   - validate input, create user, create session, issue access token + refresh cookie
2. `POST /v1/login`
   - verify credentials, create new session, issue tokens
3. `POST /v1/refresh`
   - validate cookie token, rotate session/token pair, issue fresh access token + cookie
4. `POST /v1/logout`
   - revoke current session and clear refresh cookie
5. `GET /v1/jwks`
   - publish public key as JWKS with stable `kid`

Success criteria:
- All 5 endpoints implemented and return consistent JSON error/success shapes.
- Refresh lifecycle works end-to-end.
- JWKS is consumable by downstream verifiers (e.g., Convex `customJwt`).

## Phase 5: Security Hardening
Steps:
1. Add per-route rate limiting with Upstash (`signup`, `login`, `refresh` protected).
2. Enforce CORS allowlist for trusted client origins.
3. Add structured security-focused error handling (no secret leakage).
4. Add audit-oriented logging for critical auth events (signup/login/refresh/logout failures/success).

Success criteria:
- Abuse controls are active and tested.
- CORS behaves correctly for allowed/blocked origins.
- Responses avoid sensitive detail disclosure.

## Phase 6: Testing & Verification
Steps:
1. Unit tests for auth domain logic:
   - password hashing/verify
   - JWT claims and expiration
   - refresh token rotation/replay detection
2. Integration tests for API routes with representative request/response cases.
3. Add smoke test script for local endpoint flow.
4. Run quality gates:
   - `bun run typecheck`
   - `bun test`

Success criteria:
- Critical flows are covered by deterministic tests.
- Typecheck and tests pass.
- Auth happy path and failure modes verified.

## Phase 7: Deployment Readiness (Vercel)
Steps:
1. Confirm production env vars and secret handling.
2. Validate runtime compatibility (Node runtime on Vercel).
3. Add deployment/runbook doc:
   - migrate workflow
   - env rotation notes
   - rollback basics
4. Verify public JWKS URL and integration notes for downstream apps.

Success criteria:
- Deployment checklist is complete.
- Service can be deployed with predictable setup and verification steps.

## Definition of Done (v1)
- All PRD in-scope endpoints implemented and tested.
- Security requirements implemented:
  - password hashing
  - hashed refresh tokens
  - rotation + revocation
  - secure cookies
  - CORS
  - rate limiting
- JWKS endpoint available and standards-compliant.
- Docs updated for setup, env, API usage, and deployment.
- Typecheck and tests pass.

## Execution Order Summary
1. Run Phase 0 setup commands manually.
2. Build foundational structure and config.
3. Implement schema and DB layer.
4. Implement auth domain logic.
5. Expose `/v1` routes.
6. Add security hardening.
7. Add/expand tests and run gates.
8. Finalize deployment readiness docs.
