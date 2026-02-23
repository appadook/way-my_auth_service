import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { refreshSession } from "@/server/auth/auth-service";
import { getRefreshErrorMessage, type RefreshErrorCode } from "@/server/auth/refresh-errors";
import { getCookieDebugContext, logAuthError, logAuthInfo, logAuthWarn } from "@/server/observability/auth-events";
import { apiError } from "@/server/http/response";
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "@/server/security/cookies";
import { checkRateLimit } from "@/server/security/rate-limit";
import { withCors } from "@/server/http/cors";

export type RefreshRouteDependencies = {
  checkRateLimit: typeof checkRateLimit;
  getRefreshTokenFromRequest: typeof getRefreshTokenFromRequest;
  refreshSession: typeof refreshSession;
  setRefreshTokenCookie: typeof setRefreshTokenCookie;
  clearRefreshTokenCookie: typeof clearRefreshTokenCookie;
  withCors: typeof withCors;
};

const defaultDependencies: RefreshRouteDependencies = {
  checkRateLimit,
  getRefreshTokenFromRequest,
  refreshSession,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  withCors,
};

export function createRefreshPostHandler(overrides: Partial<RefreshRouteDependencies> = {}) {
  const dependencies: RefreshRouteDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return async function POST(request: NextRequest) {
    const respond = (response: NextResponse) => dependencies.withCors(request, response);
    const cookieDebug = getCookieDebugContext(request, env.REFRESH_COOKIE_NAME);

    const rateLimit = await dependencies.checkRateLimit("refresh", request);
    if (!rateLimit.success) {
      logAuthWarn("refresh_rate_limited", {
        ...cookieDebug,
        outcome: "rate_limited",
      });
      return respond(apiError(429, "rate_limited", "Too many refresh requests. Please try again shortly."));
    }

    const refreshToken = dependencies.getRefreshTokenFromRequest(request);
    if (!refreshToken) {
      logAuthWarn("refresh_missing_cookie", {
        ...cookieDebug,
        outcome: "missing_refresh_token",
        refreshCookieName: env.REFRESH_COOKIE_NAME,
      });
      return respond(apiError(401, "missing_refresh_token", getRefreshErrorMessage("missing_refresh_token")));
    }

    try {
      const result = await dependencies.refreshSession(refreshToken);
      if (!result.ok) {
        const errorCode: RefreshErrorCode =
          result.code === "expired_refresh_token" ? "expired_refresh_token" : "invalid_refresh_token";
        const response = apiError(401, errorCode, getRefreshErrorMessage(errorCode));
        const cookieTelemetry = dependencies.clearRefreshTokenCookie(response);
        logAuthWarn("refresh_invalid_or_expired", {
          ...cookieDebug,
          outcome: errorCode,
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
      const cookieTelemetry = dependencies.setRefreshTokenCookie(response, result.data.tokens.refreshToken);
      logAuthInfo("refresh_success", {
        ...cookieDebug,
        outcome: "ok",
        cookie: cookieTelemetry,
      });

      return respond(response);
    } catch (error) {
      const response = apiError(500, "internal_error", "Something went wrong.");
      const cookieTelemetry = dependencies.clearRefreshTokenCookie(response);
      logAuthError("refresh_internal_error", {
        ...cookieDebug,
        outcome: "internal_error",
        message: error instanceof Error ? error.message : "Unknown error",
        clearCookie: cookieTelemetry,
      });
      return respond(response);
    }
  };
}
