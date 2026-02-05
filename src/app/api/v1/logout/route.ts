import { NextResponse, type NextRequest } from "next/server";
import { logoutSession } from "@/server/auth/auth-service";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { clearRefreshTokenCookie, getRefreshTokenFromRequest } from "@/server/security/cookies";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);

  const refreshToken = getRefreshTokenFromRequest(request);

  if (refreshToken) {
    await logoutSession(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  clearRefreshTokenCookie(response);

  return respond(response);
}
