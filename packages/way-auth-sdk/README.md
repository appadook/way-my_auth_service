# `@way/auth-sdk`

TypeScript SDK for WAY Auth Service.

## What This SDK Covers Today

- Browser/client helpers:
  - `signup`, `login`, `refresh`, `logout`, `me`
  - Access token store abstraction
  - `fetchWithAuth` helper with one-time 401 refresh+retry
- Frontend state helpers:
  - framework-agnostic auth state controller (`createWayAuthState`)
  - React hooks (`useWayAuthState`, `useWayAuthBootstrap`, `useCreateWayAuthState`)
- Backend helpers:
  - JWT verification against remote JWKS (`createWayAuthVerifier`)
  - developer-friendly auth guard helpers (`createWayAuthGuard`)
  - Bearer token extraction helpers

## Install Locally (without publishing)

From another project, install directly from local path:

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
```

Or with npm:

```bash
npm install ../way-my_auth_service/packages/way-auth-sdk
```

## Build SDK

From this SDK directory:

```bash
bun run build
```

## Client Usage

```ts
import { createWayAuthClient } from "@way/auth-sdk/client";

const auth = createWayAuthClient({
  baseUrl: "https://auth.example.com",
});

await auth.login({ email: "demo@example.com", password: "strong-password" });

// Calls your protected API with Authorization header from stored access token.
const response = await auth.fetchWithAuth("https://api.example.com/private");

// Hydrate current user (requires Authorization header).
const me = await auth.me();
console.log(me.user.id, me.user.email);
```

## Frontend State Wrapper Usage

```ts
import { createWayAuthClient } from "@way/auth-sdk/client";
import { createWayAuthState } from "@way/auth-sdk/state";

const authClient = createWayAuthClient({ baseUrl: "https://auth.example.com" });
const authState = createWayAuthState(authClient);

await authState.bootstrap();
console.log(authState.getState()); // status, user, errorMessage
```

React example:

```tsx
import { createWayAuthClient } from "@way/auth-sdk/client";
import { useCreateWayAuthState, useWayAuthBootstrap, useWayAuthState } from "@way/auth-sdk/react";

const client = createWayAuthClient({ baseUrl: "https://auth.example.com" });

export function AppAuthGate() {
  const controller = useCreateWayAuthState(client);
  useWayAuthBootstrap(controller);
  const state = useWayAuthState(controller);

  if (state.status === "loading" || !state.initialized) return <p>Loading session...</p>;
  if (state.status !== "authenticated") return <p>Please sign in.</p>;
  return <p>Signed in as {state.user?.email}</p>;
}
```

## Server Usage

```ts
import { createWayAuthGuard } from "@way/auth-sdk/server";

const auth = createWayAuthGuard({
  jwksUrl: "https://auth.example.com/api/v1/jwks",
  issuer: "https://auth.example.com",
  audience: "way-clients",
});

export async function requireAuth(request: Request) {
  return auth.requireAuth(request);
}

export async function maybeAuth(request: Request) {
  return auth.optionalAuth(request); // claims or null
}

export function assertOwnership(authClaims: { sub: string }, ownerId: string) {
  auth.assertOwner(authClaims, ownerId);
}
```

## Notes

- Keep access token in memory (or your preferred token store).
- Keep refresh token in HttpOnly cookie via auth service.
- `fetchWithAuth` retries once after a 401 by calling `refresh()`.
