import type { NextRequest } from "next/server";

type AuthEventLevel = "info" | "warn" | "error";

type AuthEventFields = Record<string, unknown>;

function writeLog(level: AuthEventLevel, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    scope: "auth",
    level,
    ...payload,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logAuthInfo(event: string, fields: AuthEventFields = {}): void {
  writeLog("info", { event, ...fields });
}

export function logAuthWarn(event: string, fields: AuthEventFields = {}): void {
  writeLog("warn", { event, ...fields });
}

export function logAuthError(event: string, fields: AuthEventFields = {}): void {
  writeLog("error", { event, ...fields });
}

export function getCookieDebugContext(request: NextRequest, refreshCookieName: string) {
  const cookieHeader = request.headers.get("cookie");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  return {
    method: request.method,
    pathname: request.nextUrl.pathname,
    origin,
    referer,
    hasCookieHeader: Boolean(cookieHeader),
    hasRefreshCookie: Boolean(request.cookies.get(refreshCookieName)?.value),
  };
}
