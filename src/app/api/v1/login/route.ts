import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation/auth-schemas";
import { loginWithEmailPassword } from "@/server/auth/auth-service";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
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
        return respond(apiError(401, "invalid_credentials", "Email or password is incorrect."));
      }

      return respond(apiError(400, "login_failed", "Unable to log in."));
    }

    const response = NextResponse.json({
      user: result.data.user,
      accessToken: result.data.tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: result.data.tokens.expiresIn,
    });
    setRefreshTokenCookie(response, result.data.tokens.refreshToken);

    return respond(response);
  } catch {
    return respond(apiError(500, "internal_error", "Something went wrong."));
  }
}
