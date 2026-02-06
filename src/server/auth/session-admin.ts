import type { SessionWithUser } from "@/server/auth/repositories/session-repository";

export type AdminSessionStatus = "active" | "revoked" | "expired" | "rotated";

export type AdminSession = {
  id: string;
  user: {
    id: string;
    email: string;
  };
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedBySessionId: string | null;
  status: AdminSessionStatus;
};

export function resolveAdminSessionStatus(session: SessionWithUser, now: Date = new Date()): AdminSessionStatus {
  if (session.replacedBySessionId) {
    return "rotated";
  }
  if (session.revokedAt) {
    return "revoked";
  }
  if (session.expiresAt <= now) {
    return "expired";
  }
  return "active";
}

export function toAdminSession(session: SessionWithUser, now: Date = new Date()): AdminSession {
  return {
    id: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
    replacedBySessionId: session.replacedBySessionId,
    status: resolveAdminSessionStatus(session, now),
  };
}
