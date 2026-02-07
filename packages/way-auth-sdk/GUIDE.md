# `@way/auth-sdk` Implementation Guide

This guide is for developers and coding agents integrating the WAY Auth Service in frontend apps, backend APIs, and middleware.

Use this document when you need implementation-level guidance and production-safe defaults.

## 1. What This SDK Covers

The SDK provides:
- Browser/client auth calls (`signup`, `login`, `refresh`, `logout`, `me`)
- Authenticated fetch with one automatic refresh retry
- Frontend auth state controller + React hooks
- Server-side JWT verification helpers against JWKS
- Error normalization helpers for better frontend UX

The SDK does not provide:
- UI components
- Persistent token storage by default
- Built-in wrappers for every backend framework

## 2. Entry Points

```ts
import { ... } from "@way/auth-sdk";         // common exports
import { ... } from "@way/auth-sdk/client";  // low-level client
import { ... } from "@way/auth-sdk/state";   // framework-agnostic state controller
import { ... } from "@way/auth-sdk/react";   // React hooks
import { ... } from "@way/auth-sdk/server";  // server token verification
import type { ... } from "@way/auth-sdk/types";
```

## 3. Environment Variables

### Consumer app envs

Use `bunx way-auth-setup` to generate these quickly.

| Variable | Required | Used by | Description |
| --- | --- | --- | --- |
| `WAY_AUTH_BASE_URL` | Yes | client/state/react | Auth service origin, e.g. `https://way-my-auth-service.vercel.app` |
| `WAY_AUTH_ISSUER` | For server verification | server | Expected JWT issuer (should match auth service domain) |
| `WAY_AUTH_AUDIENCE` | For server verification | server | Expected JWT audience |
| `WAY_AUTH_JWKS_URL` | For server verification | server | JWKS URL, usually `${WAY_AUTH_BASE_URL}/api/v1/jwks` |
| `WAY_AUTH_SIGNUP_SECRET` | Optional | client/state | Needed only if auth service enforces signup secret |

### Auth service envs that impact consumers

| Variable | Consumer impact |
| --- | --- |
| `SIGNUP_SECRET` | If set, signup requires header `x-way-signup-secret` |
| `JWT_ISSUER` | Must match `WAY_AUTH_ISSUER` for backend verification |
| `JWT_AUDIENCE` | Must match `WAY_AUTH_AUDIENCE` for backend verification |
| CORS origins in `/admin/cors` | Cross-origin browser clients fail without allowlist entry |

## 4. Install and Bootstrap

### Install from local monorepo path

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
```

### Generate consumer setup files

```bash
bunx way-auth-setup
```

This generates:
- `.env.local`
- `way-auth-setup-guide.md`

Override target auth service:

```bash
bunx way-auth-setup --base-url https://your-auth-domain.example
```

## 5. Client API (`@way/auth-sdk/client`)

### Create client

```ts
import { createWayAuthClient } from "@way/auth-sdk/client";

const authClient = createWayAuthClient({
  baseUrl: process.env.WAY_AUTH_BASE_URL!,
  credentials: "include", // required for refresh cookie flows in browser
  autoRefresh: true,      // default true
});
```

### Methods

```ts
await authClient.signup({ email, password });
await authClient.login({ email, password });
await authClient.refresh();
await authClient.logout();
await authClient.me();
await authClient.fetchWithAuth("/api/v1/me");
```

### Critical behavior

- Relative URLs in `fetchWithAuth("/api/v1/...")` resolve against `baseUrl`.
- `fetchWithAuth` retries once on 401 by calling `refresh()`, then replays request.
- Refresh endpoint is guarded to avoid refresh loops.
- Access token is kept in memory unless you pass a custom `tokenStore`.

### Optional signup secret

If auth service has `SIGNUP_SECRET`:

```ts
const authClient = createWayAuthClient({
  baseUrl: process.env.WAY_AUTH_BASE_URL!,
  credentials: "include",
  signupSecret: process.env.WAY_AUTH_SIGNUP_SECRET, // server-side preferred
});
```

Do not embed signup secret in public browser bundles unless that risk is acceptable.

## 6. State Controller (`@way/auth-sdk/state`)

Use this for app-level auth state and orchestration.

```ts
import { createWayAuthState } from "@way/auth-sdk/state";

const authState = createWayAuthState(authClient);
await authState.bootstrap();
```

### State shape

```ts
type WayAuthState = {
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
  user: { id: string; email: string } | null;
  errorMessage: string | null;
  initialized: boolean;
  lastUpdatedAt: string | null;
};
```

### State methods

- `bootstrap()`: refresh + me, falls back to `unauthenticated`
- `signup({ email, password })`
- `signupWithConfirm({ email, password, confirmPassword })`
- `login({ email, password })`
- `refresh()`
- `me()`
- `logout()`
- `fetchWithAuth(input, init)`
- `clearError()`
- `setCallbacks(callbacks)`

### Client-side password confirmation helper

```ts
await authState.signupWithConfirm({
  email,
  password,
  confirmPassword,
});
```

This is client-side only. API contract remains unchanged.

### Callbacks (redirect-friendly)

```ts
authState.setCallbacks({
  onLoginSuccess: (_state, user) => {
    redirectAfterAuth(user);
  },
  onSignupSuccess: (_state, user) => {
    redirectAfterAuth(user);
  },
  onLogout: () => {
    onLoggedOut();
  },
  onAuthError: (error, context) => {
    logAuthError(error, context);
  },
});
```

`context` values:
- `"bootstrap" | "signup" | "login" | "refresh" | "me" | "logout"`

## 7. React Hooks (`@way/auth-sdk/react`)

### Hooks available

- `useCreateWayAuthState(client, options?)`
- `useWayAuthState(controller)`
- `useWayAuthBootstrap(controller, enabled?)`
- `useWayAuthCallbacks(controller, callbacks)`

### Next.js client component pattern

```tsx
"use client";

import { useMemo } from "react";
import { createWayAuthClient } from "@way/auth-sdk/client";
import {
  useCreateWayAuthState,
  useWayAuthBootstrap,
  useWayAuthCallbacks,
  useWayAuthState,
} from "@way/auth-sdk/react";

export function AuthGate() {
  const client = useMemo(
    () =>
      createWayAuthClient({
        baseUrl: process.env.NEXT_PUBLIC_WAY_AUTH_BASE_URL!,
        credentials: "include",
      }),
    [],
  );

  const controller = useCreateWayAuthState(client);
  useWayAuthBootstrap(controller, true);
  useWayAuthCallbacks(controller, {
    onLoginSuccess: () => {
      window.location.assign("/app");
    },
  });

  const { initialized, status, user, errorMessage } = useWayAuthState(controller);

  if (!initialized || status === "loading") return <p>Loading session...</p>;
  if (status === "error") return <p>{errorMessage}</p>;
  if (status !== "authenticated") return <p>Please sign in</p>;
  return <p>{user?.email}</p>;
}
```

Implementation note:
- Prefer stable callback references (`useCallback` or memoized object) to avoid unnecessary re-registration.

## 8. Server Verification (`@way/auth-sdk/server`)

Use this in backend routes/middleware to verify bearer tokens.

```ts
import { createWayAuthGuard } from "@way/auth-sdk/server";

const guard = createWayAuthGuard({
  jwksUrl: process.env.WAY_AUTH_JWKS_URL!,
  issuer: process.env.WAY_AUTH_ISSUER!,
  audience: process.env.WAY_AUTH_AUDIENCE!,
});
```

### Common methods

- `requireAuth(request)` -> throws if invalid/missing token
- `optionalAuth(request)` -> token claims or `null`
- `assertOwner(auth, ownerId)` -> throws if `auth.sub !== ownerId`

### Example: generic request handler

```ts
export async function GET(request: Request) {
  const auth = await guard.requireAuth(request);
  return Response.json({ userId: auth.sub, sessionId: auth.sid ?? null });
}
```

### Error types

- `WayAuthTokenVerificationError`
  - `code: "missing_token" | "invalid_token"`
- `WayAuthAuthorizationError`
  - `code: "forbidden"`

## 9. Error Handling and UX

`WayAuthApiError` is thrown for non-OK API responses.

```ts
import { WayAuthApiError } from "@way/auth-sdk/client";
import { getWayAuthErrorMessage } from "@way/auth-sdk";

try {
  await authClient.login({ email, password });
} catch (error) {
  if (error instanceof WayAuthApiError) {
    console.log(error.status, error.code, error.details);
  }
  const message = getWayAuthErrorMessage(error);
  showToast(message);
}
```

`WAY_AUTH_ERROR_MESSAGES` contains the shared code-to-message map used by the helper.

## 10. Cookies, CORS, and Browser Constraints

- Refresh token is HttpOnly cookie managed by auth service.
- Browser JS cannot read cookie value or `Set-Cookie` response header.
- For browser apps on different origin:
  - call auth requests with `credentials: "include"`
  - add frontend origin to auth service `/admin/cors`

## 11. Integration Checklist

1. Configure consumer env vars (`WAY_AUTH_*`).
2. Configure auth service CORS for frontend origin.
3. Create `createWayAuthClient` with `credentials: "include"`.
4. Use `createWayAuthState` + `bootstrap()` for app session hydration.
5. Use `signupWithConfirm` for signup forms.
6. Use `useWayAuthCallbacks` / `setCallbacks` for redirect behavior.
7. Verify JWTs on backend with `createWayAuthGuard`.

## 12. Troubleshooting

### `missing_bearer_token` on `/me`
- You called `/me` without access token.
- Use `fetchWithAuth` or add `Authorization: Bearer <token>`.

### Login succeeds but refresh does not
- Usually CORS or credentials issue.
- Ensure `credentials: "include"` and origin is allowed in `/admin/cors`.

### `invalid_token` on backend verification
- Check `WAY_AUTH_ISSUER` and `WAY_AUTH_AUDIENCE` match auth service values exactly.

### Signup returns `invalid_signup_secret`
- Auth service has `SIGNUP_SECRET` enabled.
- Pass `signupSecret` to client or move signup call server-side.

## 13. Agent Notes

When modifying SDK behavior:
- Keep public API additive where possible.
- Update all of:
  - `README.md`
  - `GUIDE.md`
  - `src/cli-utils.ts` generated setup guide text
  - tests under `test/`
- Re-run:
  - `bun run --cwd packages/way-auth-sdk test`
  - `bun run --cwd packages/way-auth-sdk build`

