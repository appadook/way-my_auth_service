import { describe, expect, test } from "bun:test";
import { isSignupSecretAuthorized, normalizeSignupSecret } from "../src/server/security/signup-secret";

describe("signup secret helpers", () => {
  test("normalizeSignupSecret returns null for empty values", () => {
    expect(normalizeSignupSecret("")).toBeNull();
    expect(normalizeSignupSecret("   ")).toBeNull();
    expect(normalizeSignupSecret(null)).toBeNull();
    expect(normalizeSignupSecret(undefined)).toBeNull();
  });

  test("normalizeSignupSecret trims non-empty values", () => {
    expect(normalizeSignupSecret("  abc ")).toBe("abc");
  });

  test("isSignupSecretAuthorized rejects when no expected secret is configured", () => {
    expect(isSignupSecretAuthorized(null, null)).toBe(false);
    expect(isSignupSecretAuthorized("", null)).toBe(false);
    expect(isSignupSecretAuthorized(undefined, "anything")).toBe(false);
  });

  test("isSignupSecretAuthorized rejects missing or mismatched secret", () => {
    expect(isSignupSecretAuthorized("secret", null)).toBe(false);
    expect(isSignupSecretAuthorized("secret", "")).toBe(false);
    expect(isSignupSecretAuthorized("secret", "wrong")).toBe(false);
  });

  test("isSignupSecretAuthorized accepts matching secret", () => {
    expect(isSignupSecretAuthorized("secret", "secret")).toBe(true);
    expect(isSignupSecretAuthorized(" secret ", "secret")).toBe(true);
  });
});
