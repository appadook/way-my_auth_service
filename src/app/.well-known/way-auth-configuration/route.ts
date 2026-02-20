import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const DISCOVERY_VERSION = "1";
const CACHE_CONTROL_HEADER = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

const endpointPaths = {
  signup: "/api/v1/signup",
  login: "/api/v1/login",
  refresh: "/api/v1/refresh",
  logout: "/api/v1/logout",
  me: "/api/v1/me",
  jwks: "/api/v1/jwks",
} as const;

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function applyDiscoveryHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", CACHE_CONTROL_HEADER);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "content-type");
  response.headers.set("Access-Control-Max-Age", "600");

  return response;
}

function buildDiscoveryConfig() {
  const issuer = normalizeBaseUrl(env.JWT_ISSUER);

  return {
    version: DISCOVERY_VERSION,
    issuer,
    audience: env.JWT_AUDIENCE,
    jwks_url: `${issuer}${endpointPaths.jwks}`,
    endpoints: {
      signup: `${issuer}${endpointPaths.signup}`,
      login: `${issuer}${endpointPaths.login}`,
      refresh: `${issuer}${endpointPaths.refresh}`,
      logout: `${issuer}${endpointPaths.logout}`,
      me: `${issuer}${endpointPaths.me}`,
    },
  };
}

export async function OPTIONS() {
  return applyDiscoveryHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  return applyDiscoveryHeaders(NextResponse.json(buildDiscoveryConfig()));
}
