import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/server/auth/auth-service";
import { apiError } from "@/server/http/response";
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "@/server/security/cookies";
import { checkRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit("refresh", request);
  if (!rateLimit.success) {
    return apiError(429, "rate_limited", "Too many refresh requests. Please try again shortly.");
  }

  const refreshToken = getRefreshTokenFromRequest(request);
  if (!refreshToken) {
    return apiError(401, "missing_refresh_token", "Refresh token is required.");
  }

  try {
    const result = await refreshSession(refreshToken);
    if (!result.ok) {
      const response = apiError(401, "invalid_refresh_token", "Refresh token is invalid or expired.");
      clearRefreshTokenCookie(response);
      return response;
    }

    const response = NextResponse.json({
      accessToken: result.data.tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: result.data.tokens.expiresIn,
    });
    setRefreshTokenCookie(response, result.data.tokens.refreshToken);

    return response;
  } catch {
    const response = apiError(500, "internal_error", "Something went wrong.");
    clearRefreshTokenCookie(response);
    return response;
  }
}

