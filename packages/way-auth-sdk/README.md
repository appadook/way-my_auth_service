# `@way/auth-sdk`

Next.js-first authentication SDK for WAY Auth Service.

## Fastest setup

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
bunx way-auth-setup --framework next --minimal --transport-mode proxy
```

## Minimal env

Set both keys to the same value in `.env.local`:

```bash
WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
NEXT_PUBLIC_WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
```

## What setup generates

1. `src/lib/auth.ts`
- singleton `createWayAuthNext(...)`
- exports `auth.client`, `auth.server`, `auth.middleware`, `auth.matcher`

2. `middleware.ts`
- re-exports SDK middleware/matcher

3. `.env.local`
- idempotent env merge

4. `way-auth-setup-guide.md`
- project-local setup + migration notes

5. proxy mode rewrite help
- attempts to patch `next.config.*` rewrites automatically
- writes `way-auth-next-rewrites.snippet.txt` fallback when auto-merge is not safe

## Next adapter API

```ts
import { createWayAuthNext } from "@way/auth-sdk/next";

export const auth = createWayAuthNext();
```

Factory result:

- `auth.middleware`
- `auth.matcher`
- `auth.client.login`
- `auth.client.signup`
- `auth.client.refresh`
- `auth.client.logout`
- `auth.client.bootstrapSession`
- `auth.client.isPublicAuthRoute`
- `auth.client.startSessionKeepAlive`
- `auth.server.getSession`
- `auth.server.requireSession`
- `auth.errors.toUiError`

## Transport modes

- `transportMode: "direct"` (default, backward compatible)
- `transportMode: "proxy"` (recommended for Next.js app-origin rewrites)

In `proxy` mode, client transport endpoints default to relative paths (`/api/v1/*`) even when discovery metadata contains absolute upstream endpoints.

## Endpoint origin guard

```ts
createWayAuthNext({
  transportMode: "proxy",
  endpointOriginGuard: "warn", // default: "warn"
});
```

Options:

- `"off"`: no mismatch checks
- `"warn"`: log warning if resolved endpoint origins diverge from base URL origin
- `"error"`: throw on mismatch

## Route-aware bootstrap and keep-alive

```ts
const pathname = window.location.pathname;
if (!auth.client.isPublicAuthRoute(pathname)) {
  await auth.client.bootstrapSession();
}

const stopKeepAlive = auth.client.startSessionKeepAlive();
```

`startSessionKeepAlive()` is adaptive by default (derived from token TTL, clamped to safe bounds). Use `{ intervalMs }` to override.

## CLI flags

```bash
bunx way-auth-setup --framework next --minimal --transport-mode proxy
```

Common flags:

- `--transport-mode direct|proxy`
- `--no-rewrites`
- `--merge-env` / `--no-merge-env`
- `--admin-prefix`
- `--public-paths`
- `--overwrite`
- `--yes`

## Detailed guide

- `/Users/kurtik/code/public/way-my_auth_service/packages/way-auth-sdk/GUIDE.md`
