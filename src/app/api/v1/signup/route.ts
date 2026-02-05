import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { signupSchema } from "@/lib/validation/auth-schemas";
import { signupWithEmailPassword } from "@/server/auth/auth-service";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { apiError, parseJsonWithSchema } from "@/server/http/response";
import { setRefreshTokenCookie } from "@/server/security/cookies";
import { checkRateLimit } from "@/server/security/rate-limit";
import {
  SIGNUP_SECRET_HEADER,
  isSignupSecretAuthorized,
  normalizeSignupSecret,
} from "@/server/security/signup-secret";

export const runtime = "nodejs";

const signupSecret = normalizeSignupSecret(env.SIGNUP_SECRET);

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);

  const rateLimit = await checkRateLimit("signup", request);
  if (!rateLimit.success) {
    return respond(apiError(429, "rate_limited", "Too many signup attempts. Please try again shortly."));
  }

  const providedSignupSecret = request.headers.get(SIGNUP_SECRET_HEADER);
  if (!isSignupSecretAuthorized(signupSecret, providedSignupSecret)) {
    return respond(apiError(403, "invalid_signup_secret", "Signup is restricted. Provide a valid signup secret."));
  }

  const parsedBody = await parseJsonWithSchema(request, signupSchema);
  if ("error" in parsedBody) {
    return respond(parsedBody.error);
  }

  try {
    const result = await signupWithEmailPassword(parsedBody.data.email, parsedBody.data.password);
    if (!result.ok) {
      if (result.code === "email_taken") {
        return respond(apiError(409, "email_taken", "An account with this email already exists."));
      }

      return respond(apiError(400, "signup_failed", "Unable to create account."));
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
