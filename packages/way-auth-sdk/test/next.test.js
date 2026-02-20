import { describe, expect, it } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { WayAuthApiError } from "../src/client.ts";
import { createWayAuthNext, sanitizeNextRedirect } from "../src/next.ts";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createRouteFetch(routes) {
  return async (input, init = {}) => {
    const url = String(input);
    const handler = routes[url];
    if (!handler) {
      throw new Error(`Unexpected fetch URL: ${url}`);
    }

    return handler(url, init);
  };
}

async function createSignedToken() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const kid = "kid_test";
  const jwk = await exportJWK(publicKey);
  const token = await new SignJWT({ sid: "session_1" })
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject("user_1")
    .setIssuer("https://auth.example.com")
    .setAudience("way-clients")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  return {
    token,
    jwks: {
      keys: [{ ...jwk, kid, alg: "RS256", use: "sig" }],
    },
  };
}

describe("next adapter", () => {
  it("sanitizes unsafe next redirects", () => {
    expect(sanitizeNextRedirect("/admin", "/fallback")).toBe("/admin");
    expect(sanitizeNextRedirect("//evil.example", "/fallback")).toBe("/fallback");
    expect(sanitizeNextRedirect("https://evil.example", "/fallback")).toBe("/fallback");
    expect(sanitizeNextRedirect(null, "/fallback")).toBe("/fallback");
  });

  it("redirects unauthenticated admin request to login with next", async () => {
    const auth = createWayAuthNext({
      baseUrl: "https://auth.example.com",
      discoveryMode: "never",
    });

    const response = await auth.middleware(new NextRequest("https://app.example.com/admin"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.com/admin/login?next=%2Fadmin");
  });

  it("allows unauthenticated public admin paths", async () => {
    const auth = createWayAuthNext({
      baseUrl: "https://auth.example.com",
      discoveryMode: "never",
    });

    const response = await auth.middleware(new NextRequest("https://app.example.com/admin/login"));
    expect(response).toBeUndefined();
  });

  it("redirects authenticated login page visits and blocks unsafe next targets", async () => {
    const signed = await createSignedToken();
    const auth = createWayAuthNext({
      baseUrl: "https://auth.example.com",
      issuer: "https://auth.example.com",
      audience: "way-clients",
      jwksUrl: "https://auth.example.com/api/v1/jwks",
      discoveryMode: "never",
      fetch: createRouteFetch({
        "https://auth.example.com/api/v1/jwks": async () => jsonResponse(signed.jwks),
      }),
    });

    const request = new NextRequest("https://app.example.com/admin/login?next=//evil.example", {
      headers: {
        cookie: `way_access_token=${encodeURIComponent(signed.token)}`,
      },
    });

    const response = await auth.middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.com/admin");
  });

  it("bootstraps client session with refresh + me", async () => {
    const auth = createWayAuthNext({
      baseUrl: "https://auth.example.com",
      discoveryMode: "never",
      fetch: createRouteFetch({
        "https://auth.example.com/api/v1/refresh": async () =>
          jsonResponse({
            accessToken: "token_1",
            tokenType: "Bearer",
            expiresIn: 900,
          }),
        "https://auth.example.com/api/v1/me": async (_url, init) => {
          const authorization = new Headers(init.headers).get("authorization");
          if (authorization !== "Bearer token_1") {
            return jsonResponse({ error: { code: "invalid_token", message: "Bad token" } }, 401);
          }

          return jsonResponse({
            user: {
              id: "user_1",
              email: "demo@example.com",
            },
            sessionId: "session_1",
          });
        },
      }),
    });

    const result = await auth.client.bootstrapSession();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("user_1");
      expect(result.sessionId).toBe("session_1");
    }
  });

  it("returns null without cookie and returns session when cookie is valid", async () => {
    const signed = await createSignedToken();
    const auth = createWayAuthNext({
      baseUrl: "https://auth.example.com",
      issuer: "https://auth.example.com",
      audience: "way-clients",
      jwksUrl: "https://auth.example.com/api/v1/jwks",
      discoveryMode: "never",
      fetch: createRouteFetch({
        "https://auth.example.com/api/v1/jwks": async () => jsonResponse(signed.jwks),
        "https://auth.example.com/api/v1/me": async () =>
          jsonResponse({
            user: {
              id: "user_1",
              email: "demo@example.com",
            },
          }),
      }),
    });

    const noCookie = await auth.server.getSession(new Request("https://app.example.com/admin"));
    expect(noCookie).toBeNull();

    const session = await auth.server.getSession(
      new Request("https://app.example.com/admin", {
        headers: {
          cookie: `way_access_token=${encodeURIComponent(signed.token)}`,
        },
      }),
    );

    expect(session?.user.id).toBe("user_1");
    expect(session?.user.email).toBe("demo@example.com");
    expect(session?.source).toBe("me");
  });

  it("supports access token cookie name override", async () => {
    const signed = await createSignedToken();
    const auth = createWayAuthNext({
      baseUrl: "https://auth.example.com",
      issuer: "https://auth.example.com",
      audience: "way-clients",
      jwksUrl: "https://auth.example.com/api/v1/jwks",
      discoveryMode: "never",
      accessTokenCookieName: "custom_access",
      fetch: createRouteFetch({
        "https://auth.example.com/api/v1/jwks": async () => jsonResponse(signed.jwks),
      }),
    });

    const session = await auth.server.getSession(
      new Request("https://app.example.com/admin", {
        headers: {
          cookie: `custom_access=${encodeURIComponent(signed.token)}`,
        },
      }),
      {
        skipUserHydration: true,
      },
    );

    expect(session?.user.id).toBe("user_1");
    expect(session?.source).toBe("claims");
  });

  it("normalizes API errors for UI usage", () => {
    const auth = createWayAuthNext({
      baseUrl: "https://auth.example.com",
      discoveryMode: "never",
    });

    const uiError = auth.errors.toUiError(
      new WayAuthApiError("Email or password is incorrect.", {
        status: 401,
        code: "invalid_credentials",
        details: null,
      }),
    );

    expect(uiError).toEqual({
      message: "Email or password is incorrect.",
      code: "invalid_credentials",
      status: 401,
    });
  });
});
