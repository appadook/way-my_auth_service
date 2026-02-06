# `@way/auth-sdk`

TypeScript SDK for the WAY Auth Service. It provides browser/client helpers, frontend state wrappers, React hooks, and server-side JWT verification helpers.

## Install (local, without publishing)

From another project:

```bash
bun add ../way-my_auth_service/packages/way-auth-sdk
```

Or with npm:

```bash
npm install ../way-my_auth_service/packages/way-auth-sdk
```

## Consumer Setup CLI

Generate a consumer `.env.local` and a `way-auth-setup-guide.md` in your app:

```bash
bunx way-auth-setup
```

Options:

```bash
--base-url    (default: https://way-my-auth-service.vercel.app) auth service base URL
--issuer      (default: base URL)
--audience    (default: way-clients)
--jwks-url    (default: base URL + /api/v1/jwks)
--env-path    (default: .env.local)
--guide-path  (default: way-auth-setup-guide.md)
--overwrite   overwrite existing files
```

## Build & Test

```bash
bun run build
bun run test
```

## Client Usage

```ts
import { createWayAuthClient } from "@way/auth-sdk/client";

const auth = createWayAuthClient({
  baseUrl: "https://way-my-auth-service.vercel.app",
  credentials: "include",
});

await auth.login({ email: "demo@example.com", password: "strong-password" });

const me = await auth.me();
console.log(me.user.id, me.user.email);

// Calls a protected API with Authorization header
const response = await auth.fetchWithAuth("https://api.example.com/private");
```

### Signup with password confirmation

```ts
import { createWayAuthState } from "@way/auth-sdk/state";

const state = createWayAuthState(auth);
await state.signupWithConfirm({
  email: "demo@example.com",
  password: "strong-password",
  confirmPassword: "strong-password",
});
```

### Auth callbacks (React-friendly)

```tsx
import { useWayAuthCallbacks, useCreateWayAuthState } from "@way/auth-sdk/react";

const controller = useCreateWayAuthState(auth);
useWayAuthCallbacks(controller, {
  onLoginSuccess: (_state, user) => {
    console.log("Logged in", user.email);
  },
  onSignupSuccess: (_state, user) => {
    console.log("Signed up", user.email);
  },
  onLogout: () => {
    console.log("Logged out");
  },
});
```

### Error map helper

```ts
import { getWayAuthErrorMessage } from "@way/auth-sdk";

try {
  await auth.login({ email: "demo@example.com", password: "bad" });
} catch (error) {
  console.log(getWayAuthErrorMessage(error));
}
```

### Signup secret (optional)

If the auth service sets `SIGNUP_SECRET`, provide it to the SDK so `signup()` can include the required header:

```ts
const auth = createWayAuthClient({
  baseUrl: "https://way-my-auth-service.vercel.app",
  credentials: "include",
  signupSecret: process.env.WAY_AUTH_SIGNUP_SECRET,
});
```

Note: avoid embedding the signup secret in public browser bundles. Prefer server-side signup flows when `SIGNUP_SECRET` is enabled.

### Base URL behavior

- Relative URLs are resolved against `baseUrl`.
- Absolute URLs are used as-is.
- This ensures `client.me()` and `fetchWithAuth("/api/v1/me")` always target the auth service.

### Auto-refresh behavior

`fetchWithAuth` retries once on 401 by calling `refresh()`, then replays the original request with the new token. It never auto-refreshes when the original request is the refresh endpoint.

### Token storage

The SDK stores the access token in memory by default. You can supply your own store:

```ts
import { createWayAuthClient, createInMemoryTokenStore } from "@way/auth-sdk/client";

const tokenStore = createInMemoryTokenStore();
const auth = createWayAuthClient({ baseUrl: "https://way-my-auth-service.vercel.app", tokenStore });
```

## Errors

Non-OK auth responses throw `WayAuthApiError`:

```ts
try {
  await auth.login({ email: "demo@example.com", password: "bad" });
} catch (error) {
  if (error instanceof WayAuthApiError) {
    console.log(error.status, error.code, error.details);
  }
}
```

When the response is not JSON, the SDK includes a `contentType` and a `bodyPreview` in `details`.

## Frontend State Wrapper

```ts
import { createWayAuthState } from "@way/auth-sdk/state";

const authState = createWayAuthState(auth);
await authState.bootstrap();

const { status, user, initialized, errorMessage } = authState.getState();
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

## React Hooks

```tsx
import { useCreateWayAuthState, useWayAuthBootstrap, useWayAuthCallbacks, useWayAuthState } from "@way/auth-sdk/react";

const auth = createWayAuthClient({ baseUrl: "https://way-my-auth-service.vercel.app", credentials: "include" });

export function AuthGate() {
  const controller = useCreateWayAuthState(auth);
  useWayAuthBootstrap(controller);
  useWayAuthCallbacks(controller, {
    onLoginSuccess: (_state, user) => {
      console.log("Welcome", user.email);
    },
  });
  const { status, initialized, user } = useWayAuthState(controller);

  if (!initialized || status === "loading") return <p>Loading session...</p>;
  if (status !== "authenticated") return <p>Please sign in.</p>;
  return <p>Signed in as {user?.email}</p>;
}
```

## Server Usage

```ts
import { createWayAuthGuard } from "@way/auth-sdk/server";

const auth = createWayAuthGuard({
  jwksUrl: "https://way-my-auth-service.vercel.app/api/v1/jwks",
  issuer: "https://way-my-auth-service.vercel.app",
  audience: "way-clients",
});

export async function requireAuth(request: Request) {
  return auth.requireAuth(request);
}
```

## Notes

- Refresh tokens are stored in HttpOnly cookies managed by the auth service.
- Access tokens should remain in memory on the client.
- Server apps should verify tokens against JWKS rather than trusting client state.
