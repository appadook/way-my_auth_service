import { describe, expect, it } from "bun:test";
import { createWayAuthState } from "../src/state.ts";

function createMockClient(overrides = {}) {
  return {
    signup: async ({ email }) => ({
      user: { id: "user_1", email },
      accessToken: "token_signup",
      tokenType: "Bearer",
      expiresIn: 900,
    }),
    login: async ({ email }) => ({
      user: { id: "user_1", email },
      accessToken: "token_login",
      tokenType: "Bearer",
      expiresIn: 900,
    }),
    refresh: async () => ({
      accessToken: "token_refresh",
      tokenType: "Bearer",
      expiresIn: 900,
    }),
    logout: async () => ({ success: true }),
    me: async () => ({ user: { id: "user_1", email: "demo@example.com" } }),
    fetchWithAuth: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    getAccessToken: async () => "token",
    setAccessToken: async () => {},
    clearAccessToken: async () => {},
    ...overrides,
  };
}

describe("createWayAuthState", () => {
  it("bootstraps to authenticated when refresh/me succeed", async () => {
    const state = createWayAuthState(createMockClient());
    await state.bootstrap();

    const snapshot = state.getState();
    expect(snapshot.status).toBe("authenticated");
    expect(snapshot.user?.id).toBe("user_1");
    expect(snapshot.initialized).toBe(true);
  });

  it("becomes unauthenticated when bootstrap fails", async () => {
    const state = createWayAuthState(
      createMockClient({
        refresh: async () => {
          throw new Error("no session");
        },
      }),
    );

    await state.bootstrap();
    const snapshot = state.getState();
    expect(snapshot.status).toBe("unauthenticated");
    expect(snapshot.user).toBeNull();
  });

  it("tracks authenticated state on login and unauthenticated on logout", async () => {
    const state = createWayAuthState(createMockClient());
    await state.login({ email: "demo@example.com", password: "secret-password" });
    expect(state.getState().status).toBe("authenticated");

    await state.logout();
    expect(state.getState().status).toBe("unauthenticated");
  });
});

