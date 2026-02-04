import { randomBytes } from "node:crypto";
import argon2 from "argon2";

const REFRESH_TOKEN_HASH_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 12_288,
  timeCost: 2,
  parallelism: 1,
};

type ParsedRefreshToken = {
  sessionId: string;
  secret: string;
};

export function generateRefreshTokenSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function buildRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(token: string): ParsedRefreshToken | null {
  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }

  const sessionId = token.slice(0, separatorIndex);
  const secret = token.slice(separatorIndex + 1);
  if (!sessionId || !secret) {
    return null;
  }

  return { sessionId, secret };
}

export async function hashRefreshTokenSecret(secret: string): Promise<string> {
  return argon2.hash(secret, REFRESH_TOKEN_HASH_OPTIONS);
}

export async function verifyRefreshTokenSecret(hash: string, secret: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}

