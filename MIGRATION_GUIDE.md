# WAY Auth Next.js Migration Guide

## Audit Status

- `bun run lint` passed
- `bun run typecheck` passed
- `bun test` passed
- `bun run sdk:test` passed

## Goal

Move existing local Next.js consumer projects to the new SDK integration with:
- one shared `auth` module
- generated middleware
- minimal env config

## 1) Install locally from sibling repo

From each consumer project root:

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
```

## 2) Generate Next.js integration

```bash
bunx way-auth-setup --framework next --minimal --base-url https://way-my-auth-service.vercel.app --yes
```

Generated files:
- `src/lib/auth.ts`
- `middleware.ts`
- `.env.local` (merged)
- `way-auth-setup-guide.md`

## 3) Required env in consumer apps

```bash
WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
```

## 4) Replace old wrappers

Replace custom auth files/usages with generated `auth` surface:
- `auth.client.login(...)`
- `auth.client.signup(...)`
- `auth.client.refresh()`
- `auth.client.logout()`
- `auth.client.bootstrapSession()`
- `auth.client.startSessionKeepAlive(...)`
- `auth.server.getSession(request)`
- `auth.server.requireSession(request)`
- `auth.errors.toUiError(error)`

## 5) Session persistence setup (important)

In this auth service (server env):
- `REFRESH_COOKIE_SAME_SITE="none"` for cross-origin browser flows
- `REFRESH_COOKIE_DOMAIN=".example.com"` for shared-subdomain cookies (optional)
- `ACCESS_TOKEN_TTL_SECONDS="900"` (or higher based on your security/UX needs)

In consumer apps:
- call `auth.client.bootstrapSession()` on startup
- call `auth.client.startSessionKeepAlive({ intervalMs: 5 * 60 * 1000 })` in long-lived client shells

## 6) Validate each consumer project

```bash
bun run lint
bun run typecheck
bun run build
```

