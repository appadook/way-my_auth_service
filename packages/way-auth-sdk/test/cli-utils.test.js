import { describe, expect, it } from "bun:test";
import {
  buildNextEnvUpdates,
  buildConsumerConfig,
  buildEnvFile,
  buildNextAuthFile,
  buildNextMiddlewareFile,
  buildNextRewritesSnippet,
  buildNextSetupGuide,
  mergeEnvFile,
  patchNextConfigWithProxyRewrites,
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
      transportMode: "proxy",
    });
    const middlewareFile = buildNextMiddlewareFile();

    expect(authFile).toContain('createWayAuthNext');
    expect(authFile).toContain("export const auth");
    expect(authFile).toContain('transportMode: "proxy"');
    expect(middlewareFile).toContain("export default wayAuthMiddleware");
    expect(middlewareFile).toContain("matcher: wayAuthMatcher");
  });

  it("builds next env updates with both base-url keys", () => {
    const updates = buildNextEnvUpdates("https://auth.example.com/");
    expect(updates).toEqual({
      WAY_AUTH_BASE_URL: "https://auth.example.com",
      NEXT_PUBLIC_WAY_AUTH_BASE_URL: "https://auth.example.com",
    });
  });

  it("patches next.config object literal with proxy rewrites", () => {
    const existing = [
      "import type { NextConfig } from \"next\";",
      "",
      "const nextConfig: NextConfig = {",
      "  reactCompiler: true,",
      "};",
      "",
      "export default nextConfig;",
      "",
    ].join("\n");

    const patched = patchNextConfigWithProxyRewrites(existing, "https://auth.example.com");
    expect(patched.status).toBe("updated");
    expect(patched.content).toContain("async rewrites()");
    expect(patched.content).toContain('source: "/api/v1/:path*"');
    expect(patched.content).toContain('destination: "https://auth.example.com/api/v1/:path*"');
  });

  it("returns unsupported patch result when rewrites already exist", () => {
    const existing = [
      "const nextConfig = {",
      "  async rewrites() {",
      "    return [];",
      "  },",
      "};",
      "",
      "export default nextConfig;",
      "",
    ].join("\n");

    const patched = patchNextConfigWithProxyRewrites(existing, "https://auth.example.com");
    expect(patched.status).toBe("unsupported");
    expect(patched.reason).toContain("already defines rewrites");
    expect(buildNextRewritesSnippet("https://auth.example.com")).toContain("async rewrites()");
  });

  it("builds next setup guide content", () => {
    const guide = buildNextSetupGuide({
      baseUrl: "https://auth.example.com",
      envPath: ".env.local",
      authFilePath: "src/lib/auth.ts",
      middlewarePath: "middleware.ts",
      transportMode: "proxy",
    });

    expect(guide).toContain("# WAY Auth Next.js Setup");
    expect(guide).toContain('WAY_AUTH_BASE_URL="https://auth.example.com"');
    expect(guide).toContain('NEXT_PUBLIC_WAY_AUTH_BASE_URL="https://auth.example.com"');
    expect(guide).toContain("--transport-mode proxy");
    expect(guide).toContain("src/lib/auth.ts");
  });
});
