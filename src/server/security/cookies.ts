import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(env.REFRESH_COOKIE_NAME)?.value ?? null;
}

function buildRefreshCookieOptions(maxAge: number) {
  const secure = env.NODE_ENV === "production" || env.REFRESH_COOKIE_SAME_SITE === "none";

  return {
    name: env.REFRESH_COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: env.REFRESH_COOKIE_SAME_SITE,
    path: "/",
    maxAge,
    ...(env.REFRESH_COOKIE_DOMAIN.trim()
      ? {
          domain: env.REFRESH_COOKIE_DOMAIN.trim(),
        }
      : {}),
  } as const;
}

export function setRefreshTokenCookie(
  response: NextResponse,
  refreshToken: string,
  maxAge: number = REFRESH_TOKEN_TTL_SECONDS,
): void {
  response.cookies.set({
    ...buildRefreshCookieOptions(maxAge),
    value: refreshToken,
  });
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  response.cookies.set({
    ...buildRefreshCookieOptions(0),
    value: "",
  });
}
