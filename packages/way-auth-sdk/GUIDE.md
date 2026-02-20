# `@way/auth-sdk` Guide (Next.js-first)

## 1. Quick start

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
bunx way-auth-setup --framework next --minimal
```

Required env:

```bash
WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
```

## 2. Generated files

### `src/lib/auth.ts`
- Creates singleton `auth` from `createWayAuthNext()`.
- Exposes client/server/middleware surfaces from one place.

### `middleware.ts`
- Re-exports `auth.middleware` and `auth.matcher`.

### `.env.local`
- Idempotent merge of `WAY_AUTH_BASE_URL`.

### `way-auth-setup-guide.md`
- Local instructions for your app.

## 3. Runtime mental model

1. Middleware guards admin routes.
2. Client methods perform login/signup/logout/bootstrap.
3. Server helpers validate access token cookie and return typed session.
4. SDK resolves issuer/audience/JWKS/endpoints from discovery endpoint:
   `/.well-known/way-auth-configuration`.

## 4. Next adapter API

```ts
import { createWayAuthNext } from "@way/auth-sdk/next";

export const auth = createWayAuthNext();
```

Returned API:

- `auth.middleware`
- `auth.matcher`
- `auth.client.login()`
- `auth.client.signup()`
- `auth.client.logout()`
- `auth.client.bootstrapSession()`
- `auth.server.getSession()`
- `auth.server.requireSession()`
- `auth.errors.toUiError()`

## 5. Middleware defaults

- `adminPrefix = "/admin"`
- `publicPaths = ["/admin/login", "/admin/signup"]`
- `loginPath = "/admin/login"`
- `postLoginPath = "/admin"`
- `nextParamName = "next"`

Behavior:

- Unauthed protected admin route -> redirect to login with safe `next`.
- Authed login/signup route -> redirect to safe `next` or post-login path.

## 6. Config resolution

Resolver order:

1. Explicit runtime config.
2. `WAY_AUTH_BASE_URL`.
3. `NEXT_PUBLIC_WAY_AUTH_BASE_URL`.
4. Discovery (`/.well-known/way-auth-configuration`) for issuer/audience/jwks/endpoints.
5. Deterministic fallback defaults.

Discovery modes:

- `auto` (default)
- `always`
- `never`

## 7. Troubleshooting

### Redirect loops
- Verify generated `middleware.ts` is active.
- Verify access token cookie is being set by client login/bootstrap.

### Discovery failure
- Open `${WAY_AUTH_BASE_URL}/.well-known/way-auth-configuration`.
- Use `discoveryMode: "never"` with explicit overrides if needed.

### `auth.server.getSession()` is null
- Cookie missing, token expired, or verification failed.
- Check cookie name override if customized.

## 8. Migration from custom wrappers

Replace custom auth files like:

- `src/lib/auth/client.ts`
- `src/lib/auth/server.ts`
- `src/lib/auth/config.ts`
- `src/lib/auth/constants.ts`
- custom middleware logic

With:

1. generated `src/lib/auth.ts`
2. generated `middleware.ts`
3. single `WAY_AUTH_BASE_URL` env

Then move calls to:

- `auth.client.*`
- `auth.server.*`
- `auth.errors.toUiError`

## 9. Core API

If you need low-level control:

- `@way/auth-sdk/core`
- `@way/auth-sdk/client`
- `@way/auth-sdk/server`
- `@way/auth-sdk/state`
- `@way/auth-sdk/react`
