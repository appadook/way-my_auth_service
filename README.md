# WAY Auth Service

Standalone authentication service for email/password auth with JWT access tokens, refresh-token sessions, and JWKS publishing. Built to be used by any frontend or backend that can call HTTP and verify JWTs.

## What This Service Provides

- Email + password signup/login
- Short-lived JWT access tokens (RS256)
- Refresh token rotation via HttpOnly cookies
- JWKS endpoint for server verification
- Rate limiting (Upstash)
- Browser playground for end-to-end auth testing

## Architecture (Current)

- Next.js App Router (Node runtime)
- Neon Postgres via Prisma
- Upstash Redis for rate limiting
- `jose` for JWT signing/verification

## Local Setup

### Requirements

- Bun (for commands)
- Node.js 18+ (runtime)
- Postgres (Neon)
- Upstash Redis

### Environment

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
ACCESS_TOKEN_TTL_SECONDS="900"
REFRESH_COOKIE_NAME="way_refresh"
REFRESH_COOKIE_DOMAIN=""
REFRESH_COOKIE_SAME_SITE="lax"
ADMIN_EMAILS="admin@example.com"
SIGNUP_SECRET=""
```

Notes:
- `DATABASE_URL`: pooled Neon URL (runtime)
- `DIRECT_URL`: non-pooled Neon URL (migrations)
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: PEM values (escaped `\n` supported). Raw base64 key bodies are also accepted and normalized to PEM at runtime.
- `ACCESS_TOKEN_TTL_SECONDS`: access token lifetime in seconds (default `900`).
- `REFRESH_COOKIE_DOMAIN`: optional shared cookie domain (e.g. `.example.com`) for multi-subdomain setups.
- `REFRESH_COOKIE_SAME_SITE`: `lax` (default), `strict`, or `none`. Use `none` for cross-origin credentialed browser flows (requires HTTPS).
- `ADMIN_EMAILS`: comma-separated list of admin emails allowed to access the CORS admin UI.
- `SIGNUP_SECRET`: shared secret required for `POST /api/v1/signup`. Clients must send `x-way-signup-secret`.

### Prisma

```bash
bun run prisma:migrate -- --name init_auth
bun run prisma:generate
```

### Run locally

```bash
bun run dev
```

## API Endpoints

- `POST /api/v1/signup` (requires `x-way-signup-secret`)
- `POST /api/v1/login`
- `POST /api/v1/refresh`
- `POST /api/v1/logout`
- `GET /api/v1/me`
- `GET /api/v1/jwks`
- `GET /.well-known/way-auth-configuration`
- `GET /api/v1/admin/users` (admin only)
- `POST /api/v1/admin/users` (admin only)
- `PATCH /api/v1/admin/users/:id` (admin only)
- `DELETE /api/v1/admin/users/:id` (admin only)
- `GET /api/v1/admin/sessions` (admin only)
- `DELETE /api/v1/admin/sessions/:id` (admin only)

## Cookies & Sessions

- Refresh tokens are stored in **HttpOnly cookies** scoped to `/`.
- Refresh tokens are **rotated** on each `/api/v1/refresh` call.
- Access tokens are short-lived JWTs and should be kept in memory.

## Protected Pages

- `/` is public.
- `/login` is the internal sign-in UI.
- `/playground` is protected.
- `/admin/cors` is protected and admin-only.
- `/admin/sessions` is protected and admin-only.
- `/admin/users` is protected and admin-only.
- Any page under `src/app/(protected)` is guarded server-side by refresh session validation.

## Browser Playground

- `GET /playground` provides a browser-based request runner for same-origin auth testing.
- Includes editable method/path/headers/body, response inspection, and in-memory request history.
- Includes one-click `Run Full Auth Scenario` for full flow testing.

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

## SDK

Local TypeScript SDK lives in `packages/way-auth-sdk`.

Install in another local project without publishing:

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
```

Generate a Next.js-first setup with minimal config:

```bash
bunx way-auth-setup --framework next --minimal
```

This generates:
- `src/lib/auth.ts`
- `middleware.ts`
- merged `.env.local`
- `way-auth-setup-guide.md`

For baseline integration, only one env var is required:

```bash
WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
```

Override the base URL when needed:

```bash
bunx way-auth-setup --framework next --minimal --base-url https://way-my-auth-service.vercel.app
```

See:
- `/Users/kurtik/code/public/way-my_auth_service/packages/way-auth-sdk/README.md`
- `/Users/kurtik/code/public/way-my_auth_service/packages/way-auth-sdk/GUIDE.md`
- `/Users/kurtik/code/public/way-my_auth_service/way-auth-setup-guide.md`

SDK highlights:
- `createWayAuthNext()` single-object Next.js integration
- built-in middleware and matcher defaults
- discovery-driven config from `/.well-known/way-auth-configuration`
- `auth.client.bootstrapSession()` and `auth.server.getSession()`
- `auth.client.startSessionKeepAlive()` for long-lived browser tabs

## CORS Notes

If your frontend runs on a different origin, add it in the CORS admin UI at `/admin/cors`. The origin list is stored in the database and can be updated without redeploying.

For cross-origin browser sessions, also configure refresh-cookie behavior:
- set `REFRESH_COOKIE_SAME_SITE="none"`
- ensure HTTPS in production
- optionally set `REFRESH_COOKIE_DOMAIN` for shared-subdomain cookie scope

## Deployment (Vercel)

1. Set all environment variables in Vercel.
2. Ensure `JWT_ISSUER` matches your deployed auth service URL.
3. Add your client apps in the CORS admin UI at `/admin/cors`.
4. Deploy.

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run typecheck
bun run prisma:migrate -- --name init_auth
bun run prisma:generate
bun run sdk:build
bun run sdk:test
```

## Security Notes

- Passwords are hashed with argon2id.
- Refresh tokens are stored hashed in the database.
- Access tokens are signed with RS256.
- Sessions are revocable and rotated on refresh.
- Avoid embedding `SIGNUP_SECRET` in public browser apps. Prefer using a server-to-server signup proxy.
