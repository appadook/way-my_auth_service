import SessionsAdminClient from "./sessions-admin-client";
import { listSessionsWithUser } from "@/server/auth/repositories/session-repository";
import { toAdminSession } from "@/server/auth/session-admin";

export const runtime = "nodejs";

export default async function SessionsAdminPage() {
  const sessions = await listSessionsWithUser();
  const now = new Date();

  return <SessionsAdminClient initialSessions={sessions.map((session) => toAdminSession(session, now))} />;
}
