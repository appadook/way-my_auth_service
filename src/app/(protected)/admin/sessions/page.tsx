import SessionsAdminClient from "./sessions-admin-client";
import { listSessionsWithUser } from "@/server/auth/repositories/session-repository";
import { toAdminSession } from "@/server/auth/session-admin";

export const runtime = "nodejs";

export default async function SessionsAdminPage() {
  const pagination = await listSessionsWithUser({ page: 1, pageSize: 50 });
  const now = new Date();

  return (
    <SessionsAdminClient
      initialSessions={pagination.sessions.map((session) => toAdminSession(session, now))}
      initialCurrentPage={pagination.currentPage}
      initialPageSize={pagination.pageSize}
      initialTotalCount={pagination.totalCount}
      initialTotalPages={pagination.totalPages}
    />
  );
}
