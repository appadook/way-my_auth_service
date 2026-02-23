import { describe, expect, it } from "bun:test";
import { resolveRefreshCookieSameSite } from "../src/lib/env";
import {
  normalizeRefreshCookieDomain,
  resolveRefreshCookieSecure,
  resolveRefreshCookieDomainForMode,
} from "../src/server/security/cookies";

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

describe("resolveRefreshCookieSameSite", () => {
  it("defaults to lax for proxy mode", () => {
    expect(resolveRefreshCookieSameSite("proxy", undefined)).toBe("lax");
  });

  it("defaults to none for cross-site mode", () => {
    expect(resolveRefreshCookieSameSite("cross-site", undefined)).toBe("none");
  });

  it("respects explicit same-site override", () => {
    expect(resolveRefreshCookieSameSite("proxy", "strict")).toBe("strict");
    expect(resolveRefreshCookieSameSite("cross-site", "lax")).toBe("lax");
  });
});

describe("resolveRefreshCookieDomainForMode", () => {
  it("forces host-only cookies in proxy mode", () => {
    expect(resolveRefreshCookieDomainForMode("proxy", "example.com")).toBeNull();
  });

  it("allows normalized domain in cross-site mode", () => {
    expect(resolveRefreshCookieDomainForMode("cross-site", ".Auth.Example.com")).toBe("auth.example.com");
  });
});

describe("resolveRefreshCookieSecure", () => {
  it("enables secure cookies in production for proxy mode defaults", () => {
    expect(resolveRefreshCookieSecure("production", "lax")).toBe(true);
  });

  it("enables secure cookies for sameSite none in cross-site mode", () => {
    expect(resolveRefreshCookieSecure("development", "none")).toBe(true);
  });

  it("allows non-secure cookies only for non-production lax/strict modes", () => {
    expect(resolveRefreshCookieSecure("development", "lax")).toBe(false);
    expect(resolveRefreshCookieSecure("test", "strict")).toBe(false);
  });
});
