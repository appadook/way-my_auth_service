import { describe, expect, it } from "bun:test";
import { buildConsumerConfig, buildEnvFile, buildSetupGuide } from "../src/cli-utils.ts";

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

  it("builds setup guide content", () => {
    const config = buildConsumerConfig({ baseUrl: "https://auth.example.com" });
    const guide = buildSetupGuide(config);

    expect(guide).toContain("# WAY Auth Service Consumer Setup");
    expect(guide).toContain('WAY_AUTH_BASE_URL="https://auth.example.com"');
  });
});
