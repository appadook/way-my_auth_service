import { NextResponse, type NextRequest } from "next/server";
import { validateRefreshSession } from "@/server/auth/auth-service";
import { findSessionWithUserById, revokeSessionById } from "@/server/auth/repositories/session-repository";
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id?: string } },
) {
  const respond = (response: NextResponse) => withCors(request, response);
  const authError = await requireAdmin(request);
  if (authError) {
    return respond(authError);
  }

  const sessionId = params.id?.trim();
  if (!sessionId) {
    return respond(apiError(400, "invalid_session_id", "Session id is required."));
  }

  const existing = await findSessionWithUserById(sessionId);
  if (!existing) {
    return respond(apiError(404, "session_not_found", "Session not found."));
  }

  if (!existing.revokedAt) {
    await revokeSessionById(sessionId);
  }

  const updated = await findSessionWithUserById(sessionId);
  if (!updated) {
    return respond(apiError(500, "internal_error", "Something went wrong."));
  }

  return respond(
    NextResponse.json({
      session: toAdminSession(updated, new Date()),
    }),
  );
}
