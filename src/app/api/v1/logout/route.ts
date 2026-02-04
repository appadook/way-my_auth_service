import { NextResponse, type NextRequest } from "next/server";
import { logoutSession } from "@/server/auth/auth-service";
import { clearRefreshTokenCookie, getRefreshTokenFromRequest } from "@/server/security/cookies";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const refreshToken = getRefreshTokenFromRequest(request);

  if (refreshToken) {
    await logoutSession(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  clearRefreshTokenCookie(response);

  return response;
}

