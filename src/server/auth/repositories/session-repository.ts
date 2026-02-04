import type { Session } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type CreateSessionInput = {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};

type RotateSessionInput = {
  sessionId: string;
  nextRefreshTokenHash: string;
  nextExpiresAt: Date;
  rotatedAt?: Date;
};

type RotateSessionResult = {
  previousSessionId: string;
  nextSession: Session;
};

export async function createSession(input: CreateSessionInput): Promise<Session> {
  return prisma.session.create({
    data: {
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
    },
  });
}

export async function findValidSessionByRefreshTokenHash(
  refreshTokenHash: string,
  at: Date = new Date(),
): Promise<Session | null> {
  return prisma.session.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { gt: at },
    },
  });
}

export async function findSessionById(sessionId: string): Promise<Session | null> {
  return prisma.session.findUnique({
    where: { id: sessionId },
  });
}

export async function rotateSession(input: RotateSessionInput): Promise<RotateSessionResult | null> {
  const rotatedAt = input.rotatedAt ?? new Date();

  return prisma.$transaction(async (tx) => {
    const current = await tx.session.findUnique({
      where: { id: input.sessionId },
    });

    if (!current) {
      return null;
    }

    if (current.revokedAt || current.replacedBySessionId || current.expiresAt <= rotatedAt) {
      return null;
    }

    const nextSession = await tx.session.create({
      data: {
        userId: current.userId,
        refreshTokenHash: input.nextRefreshTokenHash,
        expiresAt: input.nextExpiresAt,
      },
    });

    const updated = await tx.session.updateMany({
      where: {
        id: current.id,
        revokedAt: null,
        replacedBySessionId: null,
        expiresAt: { gt: rotatedAt },
      },
      data: {
        revokedAt: rotatedAt,
        replacedBySessionId: nextSession.id,
      },
    });

    if (updated.count === 0) {
      await tx.session.delete({
        where: { id: nextSession.id },
      });
      return null;
    }

    return {
      previousSessionId: current.id,
      nextSession,
    };
  });
}

export async function revokeSessionById(sessionId: string, revokedAt: Date = new Date()): Promise<boolean> {
  const updated = await prisma.session.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt,
    },
  });

  return updated.count > 0;
}

export async function revokeSessionByRefreshTokenHash(
  refreshTokenHash: string,
  revokedAt: Date = new Date(),
): Promise<boolean> {
  const updated = await prisma.session.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt,
    },
  });

  return updated.count > 0;
}
