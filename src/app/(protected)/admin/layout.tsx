import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { env } from "@/lib/env";
import { validateRefreshSession } from "@/server/auth/auth-service";
import { isAdminEmail } from "@/server/security/admin";

export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(env.REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    redirect("/login?next=/admin/users");
  }

  const validation = await validateRefreshSession(refreshToken);
  if (!validation.ok) {
    redirect("/login?next=/admin/users");
  }

  if (!isAdminEmail(validation.data.user.email)) {
    notFound();
  }

  return <>{children}</>;
}
