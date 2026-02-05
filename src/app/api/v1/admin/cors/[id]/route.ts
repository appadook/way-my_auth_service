import { NextResponse, type NextRequest } from "next/server";
import { validateRefreshSession } from "@/server/auth/auth-service";
import { handleCorsPreflight, invalidateCorsCache, withCors } from "@/server/http/cors";
import { apiError } from "@/server/http/response";
import { removeCorsOrigin } from "@/server/http/cors-origins";
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const respond = (response: NextResponse) => withCors(request, response);
  const authError = await requireAdmin(request);
  if (authError) {
    return respond(authError);
  }

  const params = await context.params;
  if (!params.id) {
    return respond(apiError(400, "invalid_origin", "Origin id is required."));
  }

  await removeCorsOrigin(params.id);
  invalidateCorsCache();

  return respond(NextResponse.json({ success: true }));
}
