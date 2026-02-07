import { NextResponse, type NextRequest } from "next/server";
import { validateRefreshSession } from "@/server/auth/auth-service";
import { listSessionsWithUser } from "@/server/auth/repositories/session-repository";
import { toAdminSession } from "@/server/auth/session-admin";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { apiError } from "@/server/http/response";
import { getRefreshTokenFromRequest } from "@/server/security/cookies";
import { isAdminEmail } from "@/server/security/admin";

export const runtime = "nodejs";

async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = getRefreshTokenFromRequest(request);
  if (!refreshToken) {
    return apiError(401, "missing_refresh_token", "Refresh token is required.");
  }

  const validation = await validateRefreshSession(refreshToken);
  if (!validation.ok) {
    return apiError(401, "invalid_refresh_token", "Refresh token is invalid or expired.");
  }

  if (!isAdminEmail(validation.data.user.email)) {
    return apiError(403, "forbidden", "You are not authorized to access this resource.");
  }

  return null;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);
  try {
    const authError = await requireAdmin(request);
    if (authError) {
      return respond(authError);
    }

    const { searchParams } = new URL(request.url);
    const pageParam = Number(searchParams.get("page"));
    const pageSizeParam = Number(searchParams.get("pageSize"));

    const sessions = await listSessionsWithUser({
      page: Number.isFinite(pageParam) ? pageParam : undefined,
      pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : undefined,
    });
    const now = new Date();

    return respond(
      NextResponse.json({
        sessions: sessions.sessions.map((session) => toAdminSession(session, now)),
        currentPage: sessions.currentPage,
        pageSize: sessions.pageSize,
        totalCount: sessions.totalCount,
        totalPages: sessions.totalPages,
      }),
    );
  } catch {
    return respond(apiError(500, "internal_error", "Something went wrong."));
  }
}
