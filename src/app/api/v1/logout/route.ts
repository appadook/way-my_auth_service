import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { logoutSession } from "@/server/auth/auth-service";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { getCookieDebugContext, logAuthInfo } from "@/server/observability/auth-events";
import { clearRefreshTokenCookie, getRefreshTokenFromRequest } from "@/server/security/cookies";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);
  const cookieDebug = getCookieDebugContext(request, env.REFRESH_COOKIE_NAME);

  const refreshToken = getRefreshTokenFromRequest(request);

  if (refreshToken) {
    await logoutSession(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  const cookieTelemetry = clearRefreshTokenCookie(response);
  logAuthInfo("logout_cookie_cleared", {
    ...cookieDebug,
    clearCookie: cookieTelemetry,
  });

  return respond(response);
}
