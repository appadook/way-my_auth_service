# WAY Auth Migration Guide (Next.js Consumers)

## Scope

This guide covers migration to the current service + SDK behavior with:

- hardened refresh/session flow for Next.js proxy mode
- minimal consumer setup via `way-auth-setup`
- explicit fallback guidance for legacy direct cross-origin consumers

## Release Notes (2026-02-23)

### Service behavior shift

- Refresh cookie handling is now optimized for proxy deployments.
- Default cookie mode is `REFRESH_COOKIE_MODE="proxy"`:
  - host-only cookie (`Domain` unset)
  - `SameSite=Lax` by default
- `POST /api/v1/refresh` cookie contract is stable:
  - `missing_refresh_token`
  - `expired_refresh_token`
  - `invalid_refresh_token`

### Impact for legacy direct cross-origin browser clients

If your browser calls auth endpoints directly across origins (not through app-origin proxy rewrites), you must opt into cross-site mode:

```bash
REFRESH_COOKIE_MODE="cross-site"
```

Optional for shared-subdomain use cases:

```bash
REFRESH_COOKIE_DOMAIN="auth.example.com"
```

Do not use `.vercel.app` as cookie domain.

## Recommended Architecture

Use Next.js proxy mode:

- Browser -> consumer app origin (`/api/v1/*`)
- consumer app rewrites -> auth service origin

Why:

- avoids third-party cookie delivery edge cases
- keeps refresh flow predictable
- reduces intermittent `missing_refresh_token` failures

## 1) Install SDK from sibling repo

From each consumer project root:

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
```

## 2) Generate Next.js setup

Recommended (proxy mode):

```bash
bunx way-auth-setup --framework next --minimal --transport-mode proxy --base-url https://way-my-auth-service.vercel.app --yes
```

Legacy-compatible direct mode:

```bash
bunx way-auth-setup --framework next --minimal --transport-mode direct --base-url https://way-my-auth-service.vercel.app --yes
```

Generated/updated outputs:

- `src/lib/auth.ts`
- `middleware.ts`
- `.env.local` (merged)
- `way-auth-setup-guide.md`
- `next.config.*` rewrite patch in proxy mode when safe
- fallback snippet `way-auth-next-rewrites.snippet.txt` when automatic rewrite merge is unsupported

## 3) Consumer env requirements

Ensure both keys are present (same value):

```bash
WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
NEXT_PUBLIC_WAY_AUTH_BASE_URL="https://way-my-auth-service.vercel.app"
```

## 4) Service env requirements

Recommended defaults:

```bash
REFRESH_COOKIE_MODE="proxy"
ACCESS_TOKEN_TTL_SECONDS="900"
REFRESH_TOKEN_TTL_SECONDS="2592000"
```

Cross-origin browser flow only:

```bash
REFRESH_COOKIE_MODE="cross-site"
```

Optional explicit override:

```bash
# REFRESH_COOKIE_SAME_SITE="none"
```

## 5) Replace custom wrappers with SDK singleton

Use generated `src/lib/auth.ts` as the single auth surface:

- `auth.client.login(...)`
- `auth.client.signup(...)`
- `auth.client.refresh()`
- `auth.client.logout()`
- `auth.client.bootstrapSession()`
- `auth.client.isPublicAuthRoute(pathname)`
- `auth.client.startSessionKeepAlive(...)`
- `auth.server.getSession(request)`
- `auth.server.requireSession(request)`
- `auth.errors.toUiError(error)`

## 6) Recommended bootstrap pattern

Use route-aware bootstrap to avoid noisy refresh failures on public auth pages:

```ts
const pathname = window.location.pathname;
if (!auth.client.isPublicAuthRoute(pathname)) {
  await auth.client.bootstrapSession();
}

// Adaptive by default (derived from token TTL); override intervalMs when needed.
const stopKeepAlive = auth.client.startSessionKeepAlive();
```

## 7) Endpoint guardrails

`createWayAuthNext` now supports:

- `transportMode?: "direct" | "proxy"` (SDK default is `direct` for backward compatibility)
- `endpointOriginGuard?: "off" | "warn" | "error"` (default `warn`)

For strict rollout checks:

```ts
createWayAuthNext({
  transportMode: "proxy",
  endpointOriginGuard: "error",
});
```

## 8) Verification checklist

1. Login from consumer app succeeds and sets refresh cookie.
2. `POST /api/v1/refresh` succeeds through proxy endpoints.
3. Access token refreshes after expiry without forced login.
4. Protected route remains authenticated after 10+ minutes.
5. Logout/revocation returns clear structured 401 codes.
6. No intermittent `missing_refresh_token` during active session in proxy flow.

## 9) Local pre-deploy checks

Run in this repo:

```bash
bun run lint
bun run typecheck
bun test
bun run sdk:test
bun run sdk:build
bun run build
```
