import { createUser, findUserByEmail, findUserById } from "@/server/auth/repositories/user-repository";
import {
  findSessionById,
  revokeSessionById,
  rotateSession,
  createSession,
} from "@/server/auth/repositories/session-repository";
import { hashPassword, verifyPassword } from "@/server/security/password";
import {
  buildRefreshToken,
  generateRefreshTokenSecret,
  hashRefreshTokenSecret,
  parseRefreshToken,
  verifyRefreshTokenSecret,
} from "@/server/security/refresh-token";
import { REFRESH_TOKEN_TTL_SECONDS } from "@/server/security/cookies";
import { signAccessToken } from "@/server/security/jwt";
import { Prisma } from "@/generated/prisma/client";

type AuthUser = {
  id: string;
  email: string;
};

type AuthTokens = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

type AuthSuccess = {
  user?: AuthUser;
  tokens: AuthTokens;
};

type AuthFailureCode =
  | "email_taken"
  | "invalid_credentials"
  | "invalid_refresh_token"
  | "session_expired";

type AuthResult = { ok: true; data: AuthSuccess } | { ok: false; code: AuthFailureCode };

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1_000);
}

async function issueSessionTokens(user: AuthUser): Promise<AuthTokens> {
  const refreshSecret = generateRefreshTokenSecret();
  const refreshTokenHash = await hashRefreshTokenSecret(refreshSecret);
  const session = await createSession({
    userId: user.id,
    refreshTokenHash,
    expiresAt: addSeconds(new Date(), REFRESH_TOKEN_TTL_SECONDS),
  });

  const { accessToken, expiresIn } = await signAccessToken({
    userId: user.id,
    sessionId: session.id,
  });

  return {
    accessToken,
    expiresIn,
    refreshToken: buildRefreshToken(session.id, refreshSecret),
  };
}

export async function signupWithEmailPassword(email: string, password: string): Promise<AuthResult> {
  const passwordHash = await hashPassword(password);

  try {
    const user = await createUser({ email, passwordHash });
    const authUser = { id: user.id, email: user.email };

    return {
      ok: true,
      data: {
        user: authUser,
        tokens: await issueSessionTokens(authUser),
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, code: "email_taken" };
    }
    throw error;
  }
}

export async function loginWithEmailPassword(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email);
  if (!user) {
    return { ok: false, code: "invalid_credentials" };
  }

  const isPasswordValid = await verifyPassword(user.passwordHash, password);
  if (!isPasswordValid) {
    return { ok: false, code: "invalid_credentials" };
  }

  const authUser = { id: user.id, email: user.email };
  return {
    ok: true,
    data: {
      user: authUser,
      tokens: await issueSessionTokens(authUser),
    },
  };
}

export async function refreshSession(rawRefreshToken: string): Promise<AuthResult> {
  const parsed = parseRefreshToken(rawRefreshToken);
  if (!parsed) {
    return { ok: false, code: "invalid_refresh_token" };
  }

  const session = await findSessionById(parsed.sessionId);
  if (!session) {
    return { ok: false, code: "invalid_refresh_token" };
  }

  const now = new Date();
  if (session.revokedAt || session.replacedBySessionId) {
    return { ok: false, code: "invalid_refresh_token" };
  }

  if (session.expiresAt <= now) {
    return { ok: false, code: "session_expired" };
  }

  const isValidSecret = await verifyRefreshTokenSecret(session.refreshTokenHash, parsed.secret);
  if (!isValidSecret) {
    await revokeSessionById(session.id, now);
    return { ok: false, code: "invalid_refresh_token" };
  }

  const nextRefreshSecret = generateRefreshTokenSecret();
  const nextRefreshTokenHash = await hashRefreshTokenSecret(nextRefreshSecret);
  const rotated = await rotateSession({
    sessionId: session.id,
    nextRefreshTokenHash,
    nextExpiresAt: addSeconds(now, REFRESH_TOKEN_TTL_SECONDS),
    rotatedAt: now,
  });

  if (!rotated) {
    return { ok: false, code: "invalid_refresh_token" };
  }

  const { accessToken, expiresIn } = await signAccessToken({
    userId: session.userId,
    sessionId: rotated.nextSession.id,
  });

  return {
    ok: true,
    data: {
      tokens: {
        accessToken,
        expiresIn,
        refreshToken: buildRefreshToken(rotated.nextSession.id, nextRefreshSecret),
      },
    },
  };
}

export async function logoutSession(rawRefreshToken: string): Promise<void> {
  const parsed = parseRefreshToken(rawRefreshToken);
  if (!parsed) {
    return;
  }

  await revokeSessionById(parsed.sessionId);
}

export async function validateRefreshSession(
  rawRefreshToken: string,
): Promise<{ ok: true; data: { user: AuthUser; sessionId: string } } | { ok: false }> {
  const parsed = parseRefreshToken(rawRefreshToken);
  if (!parsed) {
    return { ok: false };
  }

  const session = await findSessionById(parsed.sessionId);
  if (!session) {
    return { ok: false };
  }

  const now = new Date();
  if (session.revokedAt || session.replacedBySessionId || session.expiresAt <= now) {
    return { ok: false };
  }

  const isValidSecret = await verifyRefreshTokenSecret(session.refreshTokenHash, parsed.secret);
  if (!isValidSecret) {
    return { ok: false };
  }

  const user = await createUserSessionUser(session.userId);
  if (!user) {
    return { ok: false };
  }

  return {
    ok: true,
    data: {
      user,
      sessionId: session.id,
    },
  };
}

async function createUserSessionUser(userId: string): Promise<AuthUser | null> {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }

  return { id: user.id, email: user.email };
}
