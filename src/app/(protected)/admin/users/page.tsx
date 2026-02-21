import UsersAdminClient from "./users-admin-client";
import { listUsers } from "@/server/auth/repositories/user-repository";
import { toAdminUser } from "@/server/auth/user-admin";

export const runtime = "nodejs";

export default async function UsersAdminPage() {
  const pagination = await listUsers({ page: 1, pageSize: 50 });

  return (
    <UsersAdminClient
      initialUsers={pagination.users.map((user) => toAdminUser(user))}
      initialCurrentPage={pagination.currentPage}
      initialPageSize={pagination.pageSize}
      initialTotalCount={pagination.totalCount}
      initialTotalPages={pagination.totalPages}
    />
  );
}
