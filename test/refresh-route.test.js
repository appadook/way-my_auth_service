import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { createRefreshPostHandler } from "../src/server/http/refresh-route";

function createRequest() {
  return new NextRequest("https://way-my-auth-service.vercel.app/api/v1/refresh", {
    method: "POST",
  });
}

function passthroughCors(_request, response) {
  return Promise.resolve(response);
}

async function readJson(response) {
  return await response.json();
}

describe("refresh route contract", () => {
  it("returns missing_refresh_token when no refresh cookie is present", async () => {
    const handler = createRefreshPostHandler({
      checkRateLimit: async () => ({ success: true }),
      getRefreshTokenFromRequest: () => null,
      withCors: passthroughCors,
    });

    const response = await handler(createRequest());
    const payload = await readJson(response);

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: {
        code: "missing_refresh_token",
        message: "Refresh token is required.",
      },
    });
  });

  it("returns expired_refresh_token for expired sessions", async () => {
    const handler = createRefreshPostHandler({
      checkRateLimit: async () => ({ success: true }),
      getRefreshTokenFromRequest: () => "refresh-token",
      refreshSession: async () => ({ ok: false, code: "expired_refresh_token" }),
      clearRefreshTokenCookie: (response) => {
        response.headers.set("set-cookie", "way_refresh=; Path=/; Max-Age=0; HttpOnly");
        return {
          name: "way_refresh",
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          domain: null,
        };
      },
      withCors: passthroughCors,
    });

    const response = await handler(createRequest());
    const payload = await readJson(response);

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("expired_refresh_token");
    expect(payload.error.message).toBe("Refresh token has expired.");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("returns invalid_refresh_token for invalid sessions", async () => {
    const handler = createRefreshPostHandler({
      checkRateLimit: async () => ({ success: true }),
      getRefreshTokenFromRequest: () => "refresh-token",
      refreshSession: async () => ({ ok: false, code: "invalid_refresh_token" }),
      clearRefreshTokenCookie: (response) => {
        response.headers.set("set-cookie", "way_refresh=; Path=/; Max-Age=0; HttpOnly");
        return {
          name: "way_refresh",
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          domain: null,
        };
      },
      withCors: passthroughCors,
    });

    const response = await handler(createRequest());
    const payload = await readJson(response);

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("invalid_refresh_token");
    expect(payload.error.message).toBe("Refresh token is invalid.");
  });

  it("returns access token payload and rotates refresh cookie on success", async () => {
    let cookieToken = null;
    const handler = createRefreshPostHandler({
      checkRateLimit: async () => ({ success: true }),
      getRefreshTokenFromRequest: () => "refresh-token",
      refreshSession: async () => ({
        ok: true,
        data: {
          tokens: {
            accessToken: "access-token-1",
            tokenType: "Bearer",
            expiresIn: 900,
            refreshToken: "refresh-token-2",
          },
        },
      }),
      setRefreshTokenCookie: (response, refreshToken) => {
        cookieToken = refreshToken;
        response.headers.set(
          "set-cookie",
          `way_refresh=${refreshToken}; Path=/; HttpOnly; SameSite=Lax`,
        );
        return {
          name: "way_refresh",
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 2_592_000,
          domain: null,
        };
      },
      withCors: passthroughCors,
    });

    const response = await handler(createRequest());
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      accessToken: "access-token-1",
      tokenType: "Bearer",
      expiresIn: 900,
    });
    expect(cookieToken).toBe("refresh-token-2");
    expect(response.headers.get("set-cookie")).toContain("way_refresh=refresh-token-2");
  });

  it("always returns structured JSON errors", async () => {
    const handler = createRefreshPostHandler({
      checkRateLimit: async () => ({ success: true }),
      getRefreshTokenFromRequest: () => "refresh-token",
      refreshSession: async () => {
        throw new Error("unexpected");
      },
      clearRefreshTokenCookie: () => ({
        name: "way_refresh",
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        domain: null,
      }),
      withCors: async (_request, response) => response,
    });

    const response = await handler(createRequest());
    const payload = await readJson(response);

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      error: {
        code: "internal_error",
        message: "Something went wrong.",
      },
    });
  });
});
