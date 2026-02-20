import { beforeEach, describe, expect, it } from "bun:test";
import { clearWayAuthDiscoveryCache, resolveWayAuthConfig } from "../src/config.ts";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("resolveWayAuthConfig", () => {
  beforeEach(() => {
    clearWayAuthDiscoveryCache();
  });

  it("resolves config from discovery in auto mode", async () => {
    const fetch = async (input) => {
      const url = String(input);
      if (url !== "https://auth.example.com/.well-known/way-auth-configuration") {
        throw new Error(`Unexpected URL: ${url}`);
      }

      return jsonResponse({
        version: "1",
        issuer: "https://auth.example.com",
        audience: "way-clients",
        jwks_url: "https://auth.example.com/api/v1/jwks",
        endpoints: {
          signup: "https://auth.example.com/api/v1/signup",
          login: "https://auth.example.com/api/v1/login",
          refresh: "https://auth.example.com/api/v1/refresh",
          logout: "https://auth.example.com/api/v1/logout",
          me: "https://auth.example.com/api/v1/me",
        },
      });
    };

    const resolved = await resolveWayAuthConfig({
      baseUrl: "https://auth.example.com",
      discoveryMode: "auto",
      fetch,
    });

    expect(resolved.discovery.used).toBe(true);
    expect(resolved.issuer).toBe("https://auth.example.com");
    expect(resolved.audience).toBe("way-clients");
    expect(resolved.jwksUrl).toBe("https://auth.example.com/api/v1/jwks");
    expect(resolved.endpoints.login).toBe("https://auth.example.com/api/v1/login");
  });

  it("falls back deterministically in auto mode when discovery fails", async () => {
    const resolved = await resolveWayAuthConfig({
      baseUrl: "https://auth.example.com",
      discoveryMode: "auto",
      fetch: async () => {
        throw new Error("network down");
      },
    });

    expect(resolved.discovery.used).toBe(false);
    expect(resolved.issuer).toBe("https://auth.example.com");
    expect(resolved.audience).toBe("way-clients");
    expect(resolved.jwksUrl).toBe("https://auth.example.com/api/v1/jwks");
    expect(resolved.endpoints.me).toBe("https://auth.example.com/api/v1/me");
  });

  it("throws in always mode when discovery is unavailable", async () => {
    await expect(
      resolveWayAuthConfig({
        baseUrl: "https://auth.example.com",
        discoveryMode: "always",
        fetch: async () => new Response("unavailable", { status: 503 }),
      }),
    ).rejects.toThrow("discovery is required");
  });
});
