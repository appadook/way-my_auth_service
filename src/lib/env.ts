import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  REFRESH_COOKIE_NAME: z.string().min(1),
  ADMIN_EMAILS: z.string().default(""),
  SIGNUP_SECRET: z.string().default(""),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missing = parsedEnv.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration. Check: ${missing}`);
}

function toPem(body: string, type: "PRIVATE KEY" | "PUBLIC KEY"): string {
  const normalizedBody = body.replace(/\s+/g, "");
  const lines = normalizedBody.match(/.{1,64}/g) ?? [];
  return [`-----BEGIN ${type}-----`, ...lines, `-----END ${type}-----`].join("\n");
}

function normalizePrivateKey(value: string): string {
  const normalized = value.replace(/\\n/g, "\n").trim();
  if (normalized.includes("BEGIN PRIVATE KEY")) {
    return normalized;
  }

  return toPem(normalized, "PRIVATE KEY");
}

function normalizePublicKey(value: string): string {
  const normalized = value.replace(/\\n/g, "\n").trim();
  if (normalized.includes("BEGIN PUBLIC KEY")) {
    return normalized;
  }

  return toPem(normalized, "PUBLIC KEY");
}

export const env = {
  ...parsedEnv.data,
  JWT_PRIVATE_KEY: normalizePrivateKey(parsedEnv.data.JWT_PRIVATE_KEY),
  JWT_PUBLIC_KEY: normalizePublicKey(parsedEnv.data.JWT_PUBLIC_KEY),
};
