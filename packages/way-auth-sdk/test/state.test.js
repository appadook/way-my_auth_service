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

  it("validates password confirmation before signup", async () => {
    const state = createWayAuthState(createMockClient());

    await expect(
      state.signupWithConfirm({
        email: "demo@example.com",
        password: "secret-password",
        confirmPassword: "mismatch",
      }),
    ).rejects.toThrow("Passwords do not match.");

    await state.signupWithConfirm({
      email: "demo@example.com",
      password: "secret-password",
      confirmPassword: "secret-password",
    });
    expect(state.getState().status).toBe("authenticated");
  });

  it("invokes callbacks on signup, login, and logout", async () => {
    const calls = {
      signup: 0,
      login: 0,
      logout: 0,
      error: 0,
    };

    const state = createWayAuthState(createMockClient(), {
      callbacks: {
        onSignupSuccess: () => {
          calls.signup += 1;
        },
        onLoginSuccess: () => {
          calls.login += 1;
        },
        onLogout: () => {
          calls.logout += 1;
        },
        onAuthError: () => {
          calls.error += 1;
        },
      },
    });

    await state.signup({ email: "demo@example.com", password: "secret-password" });
    await state.login({ email: "demo@example.com", password: "secret-password" });
    await state.logout();

    expect(calls.signup).toBe(1);
    expect(calls.login).toBe(1);
    expect(calls.logout).toBe(1);
    expect(calls.error).toBe(0);
  });

  it("invokes onAuthError when login fails", async () => {
    let errorContext = null;
    const state = createWayAuthState(
      createMockClient({
        login: async () => {
          throw new Error("bad credentials");
        },
      }),
      {
        callbacks: {
          onAuthError: (_error, context) => {
            errorContext = context;
          },
        },
      },
    );

    await expect(state.login({ email: "demo@example.com", password: "bad" })).rejects.toThrow("bad credentials");
    expect(errorContext).toBe("login");
  });
});
