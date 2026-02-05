import { timingSafeEqual } from "node:crypto";

export const SIGNUP_SECRET_HEADER = "x-way-signup-secret";

export function normalizeSignupSecret(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isSignupSecretAuthorized(expected: string | null, provided: string | null): boolean {
  const normalizedExpected = normalizeSignupSecret(expected);
  if (!normalizedExpected) {
    return false;
  }

  const normalizedProvided = normalizeSignupSecret(provided);
  if (!normalizedProvided) {
    return false;
  }

  const expectedBuffer = Buffer.from(normalizedExpected);
  const providedBuffer = Buffer.from(normalizedProvided);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
