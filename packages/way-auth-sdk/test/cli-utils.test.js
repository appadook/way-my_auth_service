import { describe, expect, it } from "bun:test";
import {
  buildConsumerConfig,
  buildEnvFile,
  buildNextAuthFile,
  buildNextMiddlewareFile,
  buildNextSetupGuide,
  mergeEnvFile,
} from "../src/cli-utils.ts";

describe("cli-utils", () => {
  it("normalizes base URL and fills defaults", () => {
    const config = buildConsumerConfig({ baseUrl: "https://auth.example.com/" });

    expect(config.baseUrl).toBe("https://auth.example.com");
    expect(config.issuer).toBe("https://auth.example.com");
    expect(config.audience).toBe("way-clients");
    expect(config.jwksUrl).toBe("https://auth.example.com/api/v1/jwks");
  });

  it("builds env file with expected values", () => {
    const config = buildConsumerConfig({
      baseUrl: "https://auth.example.com",
      issuer: "https://auth.example.com",
      audience: "way-clients",
      jwksUrl: "https://auth.example.com/api/v1/jwks",
    });

    const envFile = buildEnvFile(config);
    expect(envFile).toContain('WAY_AUTH_BASE_URL="https://auth.example.com"');
    expect(envFile).toContain('WAY_AUTH_ISSUER="https://auth.example.com"');
    expect(envFile).toContain('WAY_AUTH_AUDIENCE="way-clients"');
    expect(envFile).toContain('WAY_AUTH_JWKS_URL="https://auth.example.com/api/v1/jwks"');
  });

  it("merges env file idempotently without dropping unrelated keys", () => {
    const existing = ['NEXT_PUBLIC_API_URL="https://api.example.com"', 'WAY_AUTH_BASE_URL="https://old.example.com"', ""].join(
      "\n",
    );

    const merged = mergeEnvFile(existing, {
      WAY_AUTH_BASE_URL: "https://new.example.com",
    });

    expect(merged).toContain('NEXT_PUBLIC_API_URL="https://api.example.com"');
    expect(merged).toContain('WAY_AUTH_BASE_URL="https://new.example.com"');
    expect(mergeEnvFile(merged, { WAY_AUTH_BASE_URL: "https://new.example.com" })).toBe(merged);
  });

  it("builds next auth and middleware files", () => {
    const authFile = buildNextAuthFile({
      adminPrefix: "/admin",
      publicPaths: ["/admin/login", "/admin/signup"],
    });
    const middlewareFile = buildNextMiddlewareFile();

    expect(authFile).toContain('createWayAuthNext');
    expect(authFile).toContain("export const auth");
    expect(middlewareFile).toContain("export default wayAuthMiddleware");
    expect(middlewareFile).toContain("matcher: wayAuthMatcher");
  });

  it("builds next setup guide content", () => {
    const guide = buildNextSetupGuide({
      baseUrl: "https://auth.example.com",
      envPath: ".env.local",
      authFilePath: "src/lib/auth.ts",
      middlewarePath: "middleware.ts",
    });

    expect(guide).toContain("# WAY Auth Next.js Setup");
    expect(guide).toContain('WAY_AUTH_BASE_URL="https://auth.example.com"');
    expect(guide).toContain("src/lib/auth.ts");
  });
});
