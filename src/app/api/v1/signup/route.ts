import { NextResponse, type NextRequest } from "next/server";
import { signupSchema } from "@/lib/validation/auth-schemas";
import { signupWithEmailPassword } from "@/server/auth/auth-service";
import { apiError, parseJsonWithSchema } from "@/server/http/response";
import { setRefreshTokenCookie } from "@/server/security/cookies";
import { checkRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit("signup", request);
  if (!rateLimit.success) {
    return apiError(429, "rate_limited", "Too many signup attempts. Please try again shortly.");
  }

  const parsedBody = await parseJsonWithSchema(request, signupSchema);
  if ("error" in parsedBody) {
    return parsedBody.error;
  }

  try {
    const result = await signupWithEmailPassword(parsedBody.data.email, parsedBody.data.password);
    if (!result.ok) {
      if (result.code === "email_taken") {
        return apiError(409, "email_taken", "An account with this email already exists.");
      }

      return apiError(400, "signup_failed", "Unable to create account.");
    }

    const response = NextResponse.json({
      user: result.data.user,
      accessToken: result.data.tokens.accessToken,
      tokenType: "Bearer",
      expiresIn: result.data.tokens.expiresIn,
    });
    setRefreshTokenCookie(response, result.data.tokens.refreshToken);

    return response;
  } catch {
    return apiError(500, "internal_error", "Something went wrong.");
  }
}

