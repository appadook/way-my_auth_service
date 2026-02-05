# WAY Auth Service Setup Guide

This guide explains how to integrate the WAY Auth Service + SDK across frontend (React), Convex, backend, and middleware use cases. It reflects the current implementation and SDK behavior (including the `/me` and `/refresh` relative URL fix).

## 1. Core Concepts

- **Access tokens** are short-lived JWTs used in `Authorization: Bearer <token>` for protected calls.
- **Refresh tokens** are HttpOnly cookies (never readable in JS). Refreshing happens by calling `/api/v1/refresh` with `credentials: "include"`.
- Refresh cookies are scoped to `/` so protected page routes can validate sessions on the server.
- The SDK stores the **access token in memory** and automatically refreshes once on a 401 (then retries the original call).
- **`/me` is the canonical identity hydration endpoint**. It is the safe way to confirm the current user from a token.

## 2. Required Endpoints (Auth Service)

The SDK expects these endpoints:

- `POST /api/v1/signup`
- `POST /api/v1/login`
- `POST /api/v1/refresh`
- `POST /api/v1/logout`
- `GET /api/v1/me`
- `GET /api/v1/jwks`

### `/me` response

```json
{
  "user": { "id": "user_123", "email": "dev@example.com" },
  "sessionId": "optional"
}
```

### `/refresh` response

```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

### Notes

- `/refresh` reads the HttpOnly refresh cookie.
- `/logout` clears the refresh cookie and invalidates the refresh session.
- `/jwks` is public and used by backends (including Convex) to verify access tokens.

## 3. Browser + CORS Requirements

If your frontend runs on a different origin than the auth service, you must allow credentialed CORS.

- Use `/admin/cors` in the auth service to add or remove allowed origins.
- Set `ADMIN_EMAILS` in the auth service `.env` so you can access the admin UI.
- Always send `credentials: "include"` for login/refresh/logout.

Example:

```bash
ADMIN_EMAILS="admin@example.com"
```

## 4. SDK Client (Browser or Node)

### Minimal client

```ts
import { createWayAuthClient } from "@way/auth-sdk/client";

const authClient = createWayAuthClient({
  baseUrl: "http://localhost:3000",
  credentials: "include",
});
```

### What `baseUrl` does

- All **relative** endpoints and `fetchWithAuth("/api/v1/..."` calls are resolved against `baseUrl`.
- **Absolute URLs** are used as-is.
- You do **not** need to manually hardcode endpoints unless you are proxying routes.

### Example usage

```ts
await authClient.signup({ email: "demo@example.com", password: "password" });
const me = await authClient.me();

// Access token is stored in memory by the SDK.
const response = await authClient.fetchWithAuth("https://api.example.com/private");
```

## 5. Auth State (Framework-Agnostic)

`createWayAuthState` gives you a small state machine that wraps the client and tracks user + status.

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

### Create + use

```ts
import { createWayAuthState } from "@way/auth-sdk/state";

const controller = createWayAuthState(authClient);
await controller.bootstrap();

const { status, user, initialized, errorMessage, lastUpdatedAt } = controller.getState();
```

### Behavior summary

- `bootstrap()` calls `refresh()` then `me()`. If either fails, it becomes `unauthenticated`.
- `login()` / `signup()` set `authenticated` on success, and `error` on failure.
- `logout()` always ends in `unauthenticated`.
- `refresh()` updates user identity and preserves state, but throws if refresh fails.

## 6. React Integration

### Hooks

```tsx
import { useCreateWayAuthState, useWayAuthBootstrap, useWayAuthState } from "@way/auth-sdk/react";

const authClient = createWayAuthClient({
  baseUrl: "http://localhost:3000",
  credentials: "include",
});

export function AuthGate() {
  const controller = useCreateWayAuthState(authClient);
  useWayAuthBootstrap(controller);
  const { status, initialized, user, errorMessage } = useWayAuthState(controller);

  if (!initialized || status === "loading") return <p>Loading session...</p>;
  if (status === "error") return <p>Auth error: {errorMessage}</p>;
  if (status !== "authenticated") return <p>Please sign in.</p>;

  return <p>Signed in as {user?.email}</p>;
}
```

### Route guard pattern

- Gate your routes on `initialized` and `status === "authenticated"`.
- Render a loading state while `status === "loading"`.

## 7. Backend / Middleware (Non-Convex)

Use the server SDK to validate Bearer tokens from incoming requests.

```ts
import { createWayAuthGuard } from "@way/auth-sdk/server";

const guard = createWayAuthGuard({
  jwksUrl: `${process.env.WAY_AUTH_BASE_URL}/api/v1/jwks`,
  issuer: process.env.WAY_AUTH_ISSUER!,
  audience: process.env.WAY_AUTH_AUDIENCE!,
});

export async function requireAuth(request: Request) {
  return guard.requireAuth(request); // throws if invalid
}

export async function optionalAuth(request: Request) {
  return guard.optionalAuth(request); // claims | null
}

export function assertOwner(authClaims: { sub: string }, ownerId: string) {
  guard.assertOwner(authClaims, ownerId);
}
```

### Typical usage

```ts
const auth = await requireAuth(request);
// auth.sub is the user id
```

## 8. Protecting Pages Inside the Auth Service

The auth service uses a server-side guard layout for non-landing pages. The guard validates the refresh cookie without rotating it and redirects to `/` if the session is missing or invalid.

If you add new pages that should be protected, place them under the `(protected)` route group.

## 9. Convex (Server Auth Verification)

Convex must verify JWTs via JWKS (public key). Use the **custom JWT provider**:

```ts
import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      type: "customJwt",
      issuer: process.env.WAY_AUTH_ISSUER!,
      applicationID: process.env.WAY_AUTH_AUDIENCE!,
      jwks: process.env.WAY_AUTH_JWKS_URL!,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
```

### Convex env values

```bash
export WAY_AUTH_ISSUER=http://localhost:3000
export WAY_AUTH_AUDIENCE=way-clients
export WAY_AUTH_JWKS_URL=http://localhost:3000/api/v1/jwks
```

### Important: Convex runs in the cloud

Convex cannot reach `http://localhost:3000`. Use a tunnel (see Section 11) and set:

```bash
export WAY_AUTH_JWKS_URL=https://<public-tunnel-host>/api/v1/jwks
```

Keep `WAY_AUTH_ISSUER` aligned to the token `iss` claim.

## 10. Known SDK Behavior (Important)

### Relative URL handling

- `fetchWithAuth("/api/v1/me")` is automatically resolved against `baseUrl`.
- `client.me()` and other endpoint calls are safe to use across origins as long as `baseUrl` points at the auth service.

### Auto-refresh guard

- The SDK retries once on 401 by calling `refresh()`.
- It never auto-refreshes when the original request **is** the refresh endpoint.

### Non-JSON response diagnostics

When a response is not JSON, the SDK throws `WayAuthApiError` with:

```ts
{
  status,
  code: null,
  details: {
    contentType: string | null,
    bodyPreview: string
  }
}
```

This helps identify when an endpoint returns HTML instead of JSON.

## 11. Exposing JWKS for Convex (Cloudflare Tunnel)

1. Install:

```bash
brew install cloudflare/cloudflare/cloudflared
```

2. Start tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

3. Update env:

```bash
export WAY_AUTH_JWKS_URL=https://<random>.trycloudflare.com/api/v1/jwks
```

4. Restart Convex:

```bash
bun run dev:convex
```

## 12. Common Troubleshooting

### "Response body was not valid JSON"

Usually caused by calling `/api/v1/*` against the frontend origin. Ensure:

- `baseUrl` points to the auth service
- You are using **relative paths** that resolve to `baseUrl`
- CORS is configured correctly

### "ConvexError: Not authenticated"

Convex cannot verify JWT:
- issuer/audience mismatch
- JWKS unreachable
- using OIDC provider config instead of `customJwt`

## 13. Example Testing Flow

1. Start auth service at `http://localhost:3000`
2. Configure CORS for your frontend origin
3. Start tunnel for JWKS (Convex only)
4. Start Convex dev with env vars
5. Start frontend app
6. Use `createWayAuthClient` + `createWayAuthState` for UI auth
7. Use `createWayAuthGuard` for backend auth verification
