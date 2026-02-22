import { type NextRequest, NextResponse } from "next/server";
import { listCorsOrigins } from "@/server/http/cors-origins";

const DEFAULT_ALLOWED_HEADERS = ["content-type", "authorization", "x-way-signup-secret"];
const CORS_ALLOWED_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"];
const CORS_MAX_AGE_SECONDS = "600";
const CORS_CACHE_TTL_MS = 30_000;

let corsCache: { origins: Set<string>; expiresAt: number } | null = null;

function normalizeOrigin(origin: string): string | null {
  const trimmed = origin.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return null;
  }
}

async function getAllowedOrigins(): Promise<Set<string>> {
  const now = Date.now();
  if (corsCache && corsCache.expiresAt > now) {
    return corsCache.origins;
  }

  const origins = await listCorsOrigins();
  const nextOrigins = new Set(origins.map((origin) => origin.origin));
  corsCache = {
    origins: nextOrigins,
    expiresAt: now + CORS_CACHE_TTL_MS,
  };

  return nextOrigins;
}

async function getAllowedOrigin(request: NextRequest): Promise<string | null> {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return null;
  }

  const normalizedOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedOrigin) {
    return null;
  }

  if (normalizedOrigin === request.nextUrl.origin) {
    return normalizedOrigin;
  }

  const allowedOrigins = await getAllowedOrigins();
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

function resolveAllowedHeaders(request: NextRequest): string {
  const requested = request.headers.get("access-control-request-headers");
  if (!requested) {
    return DEFAULT_ALLOWED_HEADERS.join(", ");
  }

  const parsedRequested = requested
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);

  const headerSet = new Set([...DEFAULT_ALLOWED_HEADERS, ...parsedRequested]);
  return Array.from(headerSet).join(", ");
}

function applyCorsHeaders(request: NextRequest, response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", resolveAllowedHeaders(request));
  response.headers.set("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS.join(", "));
  response.headers.set("Access-Control-Max-Age", CORS_MAX_AGE_SECONDS);
  appendVary(response, "Origin");
  appendVary(response, "Access-Control-Request-Headers");

  return response;
}

export async function withCors(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const allowedOrigin = await getAllowedOrigin(request);
  if (!allowedOrigin) {
    return response;
  }

  return applyCorsHeaders(request, response, allowedOrigin);
}

export async function handleCorsPreflight(request: NextRequest): Promise<NextResponse> {
  const allowedOrigin = await getAllowedOrigin(request);
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

  return applyCorsHeaders(request, new NextResponse(null, { status: 204 }), allowedOrigin);
}

export function invalidateCorsCache(): void {
  corsCache = null;
}
