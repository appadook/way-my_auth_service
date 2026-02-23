# `@way/auth-sdk` Guide (Next.js-first)

## 1) Quick start

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
bunx way-auth-setup --framework next --minimal --transport-mode proxy
```

Required env keys in `.env.local`:

```bash
WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
NEXT_PUBLIC_WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
```

## 2) Generated files

### `src/lib/auth.ts`

- singleton `auth` from `createWayAuthNext(...)`
- single import surface for client/server/middleware APIs

### `middleware.ts`

- exports `auth.middleware` and `auth.matcher`

### `.env.local`

- idempotent merge of both base URL keys

### `way-auth-setup-guide.md`

- local setup details + migration reminders

### Proxy rewrite support

- setup attempts to patch `next.config.*` rewrites for:
  - `/.well-known/way-auth-configuration`
  - `/api/v1/:path*`
- if patching is unsafe/unsupported, setup writes:
  - `way-auth-next-rewrites.snippet.txt`

## 3) Runtime model

1. Middleware protects admin routes.
2. `auth.client.*` handles login/signup/logout/refresh/bootstrap.
3. `auth.server.*` reads and verifies access token cookie state.
4. Discovery resolves issuer/audience/JWKS metadata from:
   `/.well-known/way-auth-configuration`

## 4) Next adapter API

```ts
import { createWayAuthNext } from "@way/auth-sdk/next";

export const auth = createWayAuthNext();
```

Returned API:

- `auth.middleware`
- `auth.matcher`
- `auth.client.login()`
- `auth.client.signup()`
- `auth.client.refresh()`
- `auth.client.logout()`
- `auth.client.bootstrapSession()`
- `auth.client.isPublicAuthRoute(pathname)`
- `auth.client.startSessionKeepAlive()`
- `auth.server.getSession()`
- `auth.server.requireSession()`
- `auth.errors.toUiError()`

## 5) Middleware defaults

- `adminPrefix = "/admin"`
- `publicPaths = ["/admin/login", "/admin/signup"]`
- `loginPath = "/admin/login"`
- `postLoginPath = "/admin"`
- `nextParamName = "next"`

Behavior:

- unauthenticated protected route -> redirect to login with safe `next`
- authenticated public auth route -> redirect to safe `next` or post-login path

## 6) Transport mode and discovery

`createWayAuthNext` supports:

- `transportMode?: "direct" | "proxy"` (default: `"direct"`)
- `transportEndpoints?: Partial<...>`
- `endpointOriginGuard?: "off" | "warn" | "error"` (default: `"warn"`)

### `transportMode: "direct"`

- client requests use resolved/discovery endpoint URLs

### `transportMode: "proxy"` (recommended for Next.js)

- client transport endpoints default to same-origin relative `/api/v1/*`
- discovery metadata still resolves verification config (issuer/audience/JWKS)
- discovery absolute transport URLs do not override client transport origin

### Endpoint origin guard

- `"warn"` logs if endpoint origins diverge from base URL origin
- `"error"` throws to fail fast in CI/startup

## 7) Route-aware bootstrap + adaptive keep-alive

```ts
const pathname = window.location.pathname;
if (!auth.client.isPublicAuthRoute(pathname)) {
  const result = await auth.client.bootstrapSession();
  if (!result.ok) {
    console.warn(result.error.message);
  }
}

const stopKeepAlive = auth.client.startSessionKeepAlive();
```

Notes:

- `isPublicAuthRoute()` helps skip noisy bootstrap attempts on login/signup pages
- keep-alive interval is adaptive by default based on latest token TTL
- explicit `intervalMs` always overrides adaptive behavior

## 8) Advanced config example

```ts
const auth = createWayAuthNext({
  discoveryMode: "auto",
  transportMode: "proxy",
  endpointOriginGuard: "error",
  middleware: {
    adminPrefix: "/admin",
    publicPaths: ["/admin/login", "/admin/signup", "/admin/reset-password"],
    loginPath: "/admin/login",
    postLoginPath: "/admin",
  },
});
```

## 9) Troubleshooting

### Redirect loops

- verify generated `middleware.ts` is active
- confirm access token cookie is present after login/bootstrap
- in proxy mode, confirm rewrites exist in `next.config.*`

### `missing_refresh_token`

- proxy mode: check browser is calling same-origin `/api/v1/refresh`
- direct mode: verify service uses `REFRESH_COOKIE_MODE="cross-site"` and HTTPS

### Endpoint origin mismatch warning/error

- keep `WAY_AUTH_BASE_URL` aligned with intended transport origin
- for strict behavior use `endpointOriginGuard: "error"`

### Discovery failures

- open `${WAY_AUTH_BASE_URL}/.well-known/way-auth-configuration`
- use `discoveryMode: "never"` with explicit values only when required

## 10) Migration from custom wrappers

Replace custom files and wrappers with generated integration:

1. `src/lib/auth.ts` (SDK singleton)
2. `middleware.ts` (SDK middleware/matcher)
3. both base URL env keys
4. `auth.client.*` + `auth.server.*` calls

## 11) Core modules

For lower-level control:

- `@way/auth-sdk/core`
- `@way/auth-sdk/client`
- `@way/auth-sdk/server`
- `@way/auth-sdk/state`
- `@way/auth-sdk/react`
