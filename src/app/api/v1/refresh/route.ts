import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { refreshSession } from "@/server/auth/auth-service";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { getCookieDebugContext, logAuthError, logAuthInfo, logAuthWarn } from "@/server/observability/auth-events";
import { apiError } from "@/server/http/response";
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "@/server/security/cookies";
import { checkRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);
  const cookieDebug = getCookieDebugContext(request, env.REFRESH_COOKIE_NAME);

  const rateLimit = await checkRateLimit("refresh", request);
  if (!rateLimit.success) {
    logAuthWarn("refresh_rate_limited", {
      ...cookieDebug,
    });
    return respond(apiError(429, "rate_limited", "Too many refresh requests. Please try again shortly."));
  }

  const refreshToken = getRefreshTokenFromRequest(request);
  if (!refreshToken) {
    logAuthWarn("refresh_missing_cookie", {
      ...cookieDebug,
      refreshCookieName: env.REFRESH_COOKIE_NAME,
    });
    return respond(apiError(401, "missing_refresh_token", "Refresh token is required."));
  }

  try {
    const result = await refreshSession(refreshToken);
    if (!result.ok) {
      const response = apiError(401, "invalid_refresh_token", "Refresh token is invalid or expired.");
      const cookieTelemetry = clearRefreshTokenCookie(response);
      logAuthWarn("refresh_invalid_or_expired", {
        ...cookieDebug,
        code: result.code,
        clearCookie: cookieTelemetry,
      });
      return respond(response);
    }

    const response = NextResponse.json({
      accessToken: result.data.tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: result.data.tokens.expiresIn,
    });
    const cookieTelemetry = setRefreshTokenCookie(response, result.data.tokens.refreshToken);
    logAuthInfo("refresh_success", {
      ...cookieDebug,
      cookie: cookieTelemetry,
    });

    return respond(response);
  } catch (error) {
    const response = apiError(500, "internal_error", "Something went wrong.");
    const cookieTelemetry = clearRefreshTokenCookie(response);
    logAuthError("refresh_internal_error", {
      ...cookieDebug,
      message: error instanceof Error ? error.message : "Unknown error",
      clearCookie: cookieTelemetry,
    });
    return respond(response);
  }
}
