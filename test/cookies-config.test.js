import { describe, expect, it } from "bun:test";
import { normalizeRefreshCookieDomain } from "../src/server/security/cookies";

describe("normalizeRefreshCookieDomain", () => {
  it("normalizes valid domains", () => {
    expect(normalizeRefreshCookieDomain("  .Auth.Example.com ")).toBe("auth.example.com");
    expect(normalizeRefreshCookieDomain("example.com")).toBe("example.com");
  });

  it("rejects invalid or unsafe domains", () => {
    expect(normalizeRefreshCookieDomain("")).toBeNull();
    expect(normalizeRefreshCookieDomain("localhost")).toBeNull();
    expect(normalizeRefreshCookieDomain(".vercel.app")).toBeNull();
    expect(normalizeRefreshCookieDomain("https://example.com")).toBeNull();
    expect(normalizeRefreshCookieDomain("example.com/path")).toBeNull();
    expect(normalizeRefreshCookieDomain("example.com:443")).toBeNull();
  });

  it("allows exact hosts on Vercel subdomains", () => {
    expect(normalizeRefreshCookieDomain("way-my-auth-service.vercel.app")).toBe(
      "way-my-auth-service.vercel.app",
    );
  });
});
