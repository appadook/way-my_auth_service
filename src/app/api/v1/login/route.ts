import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation/auth-schemas";
import { loginWithEmailPassword } from "@/server/auth/auth-service";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { logAuthError, logAuthInfo, logAuthWarn } from "@/server/observability/auth-events";
import { apiError, parseJsonWithSchema } from "@/server/http/response";
import { setRefreshTokenCookie } from "@/server/security/cookies";
import { checkRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);

  const rateLimit = await checkRateLimit("login", request);
  if (!rateLimit.success) {
    logAuthWarn("login_rate_limited", {
      pathname: request.nextUrl.pathname,
      origin: request.headers.get("origin"),
    });
    return respond(apiError(429, "rate_limited", "Too many login attempts. Please try again shortly."));
  }

  const parsedBody = await parseJsonWithSchema(request, loginSchema);
  if ("error" in parsedBody) {
    return respond(parsedBody.error);
  }

  try {
    const result = await loginWithEmailPassword(parsedBody.data.email, parsedBody.data.password);
    if (!result.ok) {
      if (result.code === "invalid_credentials") {
        logAuthWarn("login_invalid_credentials", {
          pathname: request.nextUrl.pathname,
          origin: request.headers.get("origin"),
        });
        return respond(apiError(401, "invalid_credentials", "Email or password is incorrect."));
      }

      logAuthWarn("login_failed", {
        pathname: request.nextUrl.pathname,
        origin: request.headers.get("origin"),
        code: result.code,
      });
      return respond(apiError(400, "login_failed", "Unable to log in."));
    }

    const response = NextResponse.json({
      user: result.data.user,
      accessToken: result.data.tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: result.data.tokens.expiresIn,
    });
    const cookieTelemetry = setRefreshTokenCookie(response, result.data.tokens.refreshToken);
    logAuthInfo("login_cookie_set", {
      pathname: request.nextUrl.pathname,
      origin: request.headers.get("origin"),
      cookie: cookieTelemetry,
    });

    return respond(response);
  } catch (error) {
    logAuthError("login_internal_error", {
      pathname: request.nextUrl.pathname,
      origin: request.headers.get("origin"),
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return respond(apiError(500, "internal_error", "Something went wrong."));
  }
}
