import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

const CORS_ALLOWED_HEADERS = "content-type, authorization";
const CORS_ALLOWED_METHODS = "GET, POST, OPTIONS";
const CORS_MAX_AGE_SECONDS = "600";

const allowedOrigins = new Set(
  env.CORS_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0),
);

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function getAllowedOrigin(request: NextRequest): string | null {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return null;
  }

  const normalizedOrigin = normalizeOrigin(requestOrigin);
  if (!allowedOrigins.has(normalizedOrigin)) {
    return null;
  }

  return normalizedOrigin;
}

function appendVary(response: NextResponse, value: string): void {
  const existing = response.headers.get("Vary");
  if (!existing) {
    response.headers.set("Vary", value);
    return;
  }

  const currentValues = existing
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!currentValues.includes(value.toLowerCase())) {
    response.headers.set("Vary", `${existing}, ${value}`);
  }
}

function applyCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);
  response.headers.set("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS);
  response.headers.set("Access-Control-Max-Age", CORS_MAX_AGE_SECONDS);
  appendVary(response, "Origin");

  return response;
}

export function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const allowedOrigin = getAllowedOrigin(request);
  if (!allowedOrigin) {
    return response;
  }

  return applyCorsHeaders(response, allowedOrigin);
}

export function handleCorsPreflight(request: NextRequest): NextResponse {
  const allowedOrigin = getAllowedOrigin(request);
  if (!allowedOrigin) {
    return NextResponse.json(
      {
        error: {
          code: "cors_origin_denied",
          message: "Origin is not allowed.",
        },
      },
      { status: 403 },
    );
  }

  return applyCorsHeaders(new NextResponse(null, { status: 204 }), allowedOrigin);
}
