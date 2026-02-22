import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const DISALLOWED_COOKIE_DOMAINS = new Set(["vercel.app"]);
let hasLoggedInvalidDomainWarning = false;

export type RefreshCookieTelemetry = {
  name: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: "/";
  maxAge: number;
  domain: string | null;
};

export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(env.REFRESH_COOKIE_NAME)?.value ?? null;
}

export function normalizeRefreshCookieDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const withoutLeadingDot = trimmed.replace(/^\.+/, "");
  if (!withoutLeadingDot) {
    return null;
  }

  if (
    withoutLeadingDot.includes("/") ||
    withoutLeadingDot.includes(":") ||
    withoutLeadingDot.includes(" ")
  ) {
    return null;
  }

  if (withoutLeadingDot === "localhost") {
    return null;
  }

  if (DISALLOWED_COOKIE_DOMAINS.has(withoutLeadingDot)) {
    return null;
  }

  return withoutLeadingDot;
}

function resolveRefreshCookieDomain(): string | null {
  const configured = env.REFRESH_COOKIE_DOMAIN;
  const normalized = normalizeRefreshCookieDomain(configured);

  if (!normalized && configured.trim() && !hasLoggedInvalidDomainWarning) {
    hasLoggedInvalidDomainWarning = true;
    console.warn(
      JSON.stringify({
        level: "warn",
        scope: "auth.cookie",
        event: "invalid_refresh_cookie_domain_ignored",
        configuredDomain: configured,
      }),
    );
  }

  return normalized;
}

function buildRefreshCookieTelemetry(maxAge: number): RefreshCookieTelemetry {
  const secure = env.NODE_ENV === "production" || env.REFRESH_COOKIE_SAME_SITE === "none";
  const domain = resolveRefreshCookieDomain();

  return {
    name: env.REFRESH_COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: env.REFRESH_COOKIE_SAME_SITE,
    path: "/",
    maxAge,
    domain,
  } as const;
}

export function getRefreshCookieTelemetry(maxAge: number = REFRESH_TOKEN_TTL_SECONDS): RefreshCookieTelemetry {
  return buildRefreshCookieTelemetry(maxAge);
}

export function setRefreshTokenCookie(
  response: NextResponse,
  refreshToken: string,
  maxAge: number = REFRESH_TOKEN_TTL_SECONDS,
): RefreshCookieTelemetry {
  const telemetry = buildRefreshCookieTelemetry(maxAge);
  const { domain, ...cookieBase } = telemetry;
  response.cookies.set({
    ...cookieBase,
    ...(domain ? { domain } : {}),
    value: refreshToken,
  });
  return telemetry;
}

export function clearRefreshTokenCookie(response: NextResponse): RefreshCookieTelemetry {
  const telemetry = buildRefreshCookieTelemetry(0);
  const { domain, ...cookieBase } = telemetry;
  response.cookies.set({
    ...cookieBase,
    ...(domain ? { domain } : {}),
    value: "",
  });
  return telemetry;
}
