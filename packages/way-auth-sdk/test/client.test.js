import { describe, expect, it } from "bun:test";
import { createInMemoryTokenStore, createWayAuthClient, WayAuthApiError } from "../src/client.ts";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createMockFetch(handlers) {
  const calls = [];

  return {
    calls,
    fetch: async (input, init = {}) => {
      calls.push({
        input: String(input),
        init,
      });

      const handler = handlers.shift();
      if (!handler) {
        throw new Error(`Unexpected fetch call for ${String(input)}.`);
      }

      return handler(input, init);
    },
  };
}

describe("createWayAuthClient", () => {
  it("stores access token after login", async () => {
    const mock = createMockFetch([
      () =>
        jsonResponse({
          user: { id: "u_1", email: "demo@example.com" },
          accessToken: "token_1",
          tokenType: "Bearer",
          expiresIn: 900,
        }),
    ]);

    const client = createWayAuthClient({
      baseUrl: "https://auth.example.com",
      fetch: mock.fetch,
    });

    await client.login({ email: "demo@example.com", password: "secret-password" });
    expect(await client.getAccessToken()).toBe("token_1");
    expect(mock.calls[0].input).toBe("https://auth.example.com/api/v1/login");
  });

  it("refreshes and retries once when protected request returns 401", async () => {
    const tokenStore = createInMemoryTokenStore("stale_token");
    const mock = createMockFetch([
      () => jsonResponse({ error: { code: "invalid_token", message: "Expired." } }, 401),
      () => jsonResponse({ accessToken: "fresh_token", tokenType: "Bearer", expiresIn: 900 }),
      () => jsonResponse({ value: "ok" }, 200),
    ]);

    const client = createWayAuthClient({
      baseUrl: "https://auth.example.com",
      fetch: mock.fetch,
      tokenStore,
    });

    const response = await client.fetchWithAuth("https://api.example.com/private");
    expect(response.status).toBe(200);
    expect(await client.getAccessToken()).toBe("fresh_token");

    const firstAuthorization = new Headers(mock.calls[0].init.headers).get("authorization");
    const retriedAuthorization = new Headers(mock.calls[2].init.headers).get("authorization");
    expect(firstAuthorization).toBe("Bearer stale_token");
    expect(retriedAuthorization).toBe("Bearer fresh_token");
    expect(mock.calls[1].input).toBe("https://auth.example.com/api/v1/refresh");
  });

  it("throws WayAuthApiError for non-ok auth responses", async () => {
    const mock = createMockFetch([
      () => jsonResponse({ error: { code: "invalid_credentials", message: "Invalid credentials." } }, 401),
    ]);

    const client = createWayAuthClient({
      baseUrl: "https://auth.example.com",
      fetch: mock.fetch,
    });

    await expect(client.login({ email: "demo@example.com", password: "bad-password" })).rejects.toBeInstanceOf(
      WayAuthApiError,
    );
  });
});

