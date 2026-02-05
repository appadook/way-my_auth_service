# WAY Auth Service

Standalone auth service for email/password authentication with JWT access tokens, refresh-token sessions, and JWKS publishing.

## Required Environment Variables

Set these in `.env` (local) and Vercel project envs (production):

```bash
DATABASE_URL=""
DIRECT_URL=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
JWT_PRIVATE_KEY=""
JWT_PUBLIC_KEY=""
JWT_ISSUER=""
JWT_AUDIENCE=""
REFRESH_COOKIE_NAME="way_refresh"
```

Notes:
- `DATABASE_URL`: pooled Neon URL (runtime)
- `DIRECT_URL`: non-pooled Neon URL (migrations)
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: PEM values (escaped `\n` supported). Raw base64 key bodies are also accepted and normalized to PEM at runtime.

## Local Commands

```bash
bun run prisma:migrate -- --name init_auth
bun run prisma:generate
bun run typecheck
```

To run the app yourself:

```bash
bun run dev
```

## API Endpoints

- `POST /api/v1/signup`
- `POST /api/v1/login`
- `POST /api/v1/refresh`
- `POST /api/v1/logout`
- `GET /api/v1/me`
- `GET /api/v1/jwks`

## Browser Testing UI

- `GET /playground` provides a browser-based request runner for same-origin auth testing.
- Includes editable method/path/headers/body, response inspection, and in-memory request history.
- Includes one-click `Run Full Auth Scenario` to execute the full auth flow and log pass/fail per step.

### Cookie Debug Probe (development only)

- `GET /api/v1/_debug/cookie`
- Returns:
  - `cookieName`
  - `present` (boolean)
  - `checkedAt` (ISO timestamp)
- Returns `404` outside development.

Notes:
- Browser JavaScript cannot read HttpOnly cookie values.
- Browser JavaScript cannot read `Set-Cookie` response headers.
- Use `/api/v1/_debug/cookie` to confirm whether the refresh cookie exists in dev.

## Local SDK

This repo includes a local TypeScript SDK at `packages/way-auth-sdk` with:
- client helpers (`createWayAuthClient`)
- server verification helpers (`createWayAuthGuard`, `createWayAuthVerifier`)
- frontend state wrappers (`createWayAuthState`) and React hooks (`@way/auth-sdk/react`)

Install in another local project without publishing:

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
```
