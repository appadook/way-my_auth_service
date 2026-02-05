import { describe, expect, it } from "bun:test";
import { createWayAuthGuard, WayAuthAuthorizationError, extractBearerToken } from "../src/server.ts";

describe("extractBearerToken", () => {
  it("returns token for valid Bearer header", () => {
    expect(extractBearerToken("Bearer token_123")).toBe("token_123");
  });

  it("is case-insensitive for bearer scheme", () => {
    expect(extractBearerToken("bearer token_abc")).toBe("token_abc");
  });

  it("returns null for invalid headers", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
  });
});

describe("createWayAuthGuard", () => {
  it("optionalAuth returns null when authorization header is missing", async () => {
    const guard = createWayAuthGuard({
      jwksUrl: "https://auth.example.com/api/v1/jwks",
      issuer: "https://auth.example.com",
      audience: "way-clients",
    });

    const result = await guard.optionalAuth(new Request("https://api.example.com/private"));
    expect(result).toBeNull();
  });

  it("assertOwner throws when subjects do not match", () => {
    const guard = createWayAuthGuard({
      jwksUrl: "https://auth.example.com/api/v1/jwks",
      issuer: "https://auth.example.com",
      audience: "way-clients",
    });

    expect(() => guard.assertOwner({ sub: "user_1" }, "user_2")).toThrow(WayAuthAuthorizationError);
  });
});
