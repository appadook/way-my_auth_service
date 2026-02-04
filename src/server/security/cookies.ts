import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(env.REFRESH_COOKIE_NAME)?.value ?? null;
}

export function setRefreshTokenCookie(
  response: NextResponse,
  refreshToken: string,
  maxAge: number = REFRESH_TOKEN_TTL_SECONDS,
): void {
  response.cookies.set({
    name: env.REFRESH_COOKIE_NAME,
    value: refreshToken,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1",
    maxAge,
  });
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  response.cookies.set({
    name: env.REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1",
    maxAge: 0,
  });
}

