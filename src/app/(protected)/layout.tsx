import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { validateRefreshSession } from "@/server/auth/auth-service";

export const runtime = "nodejs";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(env.REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    redirect("/login");
  }

  const validation = await validateRefreshSession(refreshToken);
  if (!validation.ok) {
    redirect("/login");
  }

  return <>{children}</>;
}
