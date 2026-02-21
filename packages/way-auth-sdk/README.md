# `@way/auth-sdk`

Next.js-first authentication SDK for WAY Auth Service.

## Fastest Next.js setup

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
bunx way-auth-setup --framework next --minimal
```

Set one env var in `.env.local`:

```bash
WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
```

## What gets generated

1. `src/lib/auth.ts`
- Creates a single `createWayAuthNext()` instance.
- Exposes `auth.client`, `auth.server`, `auth.middleware`, `auth.matcher`.

2. `middleware.ts`
- Re-exports SDK middleware and matcher.

3. `.env.local`
- Merges in `WAY_AUTH_BASE_URL` (idempotent).

4. `way-auth-setup-guide.md`
- Project-local usage and migration notes.

## One-env minimal config

`WAY_AUTH_BASE_URL` is enough for baseline integration.

The SDK resolves additional config (issuer, audience, JWKS URL, endpoint URLs) using:

- `GET /.well-known/way-auth-configuration`

Discovery modes:

- `auto` (default): use discovery when available, fallback otherwise.
- `always`: require discovery, throw if unavailable.
- `never`: skip discovery and use provided/default values.

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
- `auth.client.startSessionKeepAlive`
- `auth.server.getSession`
- `auth.server.requireSession`
- `auth.errors.toUiError`

## Advanced overrides

```ts
const auth = createWayAuthNext({
  discoveryMode: "always",
  accessTokenCookieName: "way_access_token",
  middleware: {
    adminPrefix: "/admin",
    publicPaths: ["/admin/login", "/admin/signup"],
    loginPath: "/admin/login",
    postLoginPath: "/admin",
    nextParamName: "next",
  },
  hydrationStrategy: "best-effort",
});
```

Keep session active in long-lived browser tabs:

```ts
const stopKeepAlive = auth.client.startSessionKeepAlive({ intervalMs: 5 * 60 * 1000 });
// call stopKeepAlive() on teardown if needed
```

## Core low-level API

If you do not want the Next adapter:

- `@way/auth-sdk/core`
- `@way/auth-sdk/client`
- `@way/auth-sdk/server`
- `@way/auth-sdk/state`
- `@way/auth-sdk/react`

`@way/auth-sdk/core` exports config resolution helpers and base client/server primitives.

## CLI flags

```bash
bunx way-auth-setup --framework next --minimal
```

Common flags:

- `--merge-env` (default: true)
- `--admin-prefix`
- `--public-paths`
- `--overwrite`
- `--yes`

## Detailed guide

See:

- `/Users/kurtik/code/public/way-my_auth_service/packages/way-auth-sdk/GUIDE.md`
