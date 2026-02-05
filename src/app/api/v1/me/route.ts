import { type NextRequest, NextResponse } from "next/server";
import { findUserById } from "@/server/auth/repositories/user-repository";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { apiError } from "@/server/http/response";
import { verifyAccessToken } from "@/server/security/jwt";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function extractBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export async function GET(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);

  const token = extractBearerToken(request);
  if (!token) {
    return respond(apiError(401, "missing_bearer_token", "Authorization Bearer token is required."));
  }

  try {
    const { payload } = await verifyAccessToken(token);
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) {
      return respond(apiError(401, "invalid_token", "Token subject is invalid."));
    }

    const user = await findUserById(userId);
    if (!user) {
      return respond(apiError(401, "invalid_token", "Token user no longer exists."));
    }

    const sessionId = typeof payload.sid === "string" ? payload.sid : null;

    return respond(
      NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
        },
        ...(sessionId ? { sessionId } : {}),
      }),
    );
  } catch {
    return respond(apiError(401, "invalid_token", "Access token is invalid or expired."));
  }
}
