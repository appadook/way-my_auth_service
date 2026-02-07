import type { Session, User } from "@/generated/prisma/client";
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

export type SessionWithUser = Session & { user: User };
export type ListSessionsWithUserInput = {
  page?: number;
  pageSize?: number;
};

export type ListSessionsWithUserResult = {
  sessions: SessionWithUser[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
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

export async function findSessionWithUserById(sessionId: string): Promise<SessionWithUser | null> {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
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

function toPositiveInteger(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

export async function listSessionsWithUser(
  input: ListSessionsWithUserInput = {},
): Promise<ListSessionsWithUserResult> {
  const currentPage = toPositiveInteger(input.page, 1);
  const rawPageSize = toPositiveInteger(input.pageSize, 50);
  const pageSize = Math.min(rawPageSize, 100);
  const skip = (currentPage - 1) * pageSize;

  const [sessions, totalCount] = await prisma.$transaction([
    prisma.session.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.session.count(),
  ]);

  return {
    sessions,
    totalCount,
    currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
