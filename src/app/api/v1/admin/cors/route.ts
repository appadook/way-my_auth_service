import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateRefreshSession } from "@/server/auth/auth-service";
import { handleCorsPreflight, invalidateCorsCache, withCors } from "@/server/http/cors";
import { apiError, parseJsonWithSchema } from "@/server/http/response";
import { addCorsOrigin, listCorsOrigins, normalizeCorsOriginInput } from "@/server/http/cors-origins";
import { getRefreshTokenFromRequest } from "@/server/security/cookies";
import { isAdminEmail } from "@/server/security/admin";

export const runtime = "nodejs";

const addOriginSchema = z.object({
  origin: z.string().min(1),
});

async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = getRefreshTokenFromRequest(request);
  if (!refreshToken) {
    return apiError(401, "missing_refresh_token", "Refresh token is required.");
  }

  const validation = await validateRefreshSession(refreshToken);
  if (!validation.ok) {
    return apiError(401, "invalid_refresh_token", "Refresh token is invalid or expired.");
  }

  if (!isAdminEmail(validation.data.user.email)) {
    return apiError(403, "forbidden", "You are not authorized to access this resource.");
  }

  return null;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);
  const authError = await requireAdmin(request);
  if (authError) {
    return respond(authError);
  }

  const origins = await listCorsOrigins();
  return respond(
    NextResponse.json({
      origins: origins.map((origin) => ({
        id: origin.id,
        origin: origin.origin,
        createdAt: origin.createdAt.toISOString(),
        updatedAt: origin.updatedAt.toISOString(),
      })),
    }),
  );
}

export async function POST(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);
  const authError = await requireAdmin(request);
  if (authError) {
    return respond(authError);
  }

  const parsedBody = await parseJsonWithSchema(request, addOriginSchema);
  if ("error" in parsedBody) {
    return respond(parsedBody.error);
  }

  let normalizedOrigin: string;
  try {
    normalizedOrigin = normalizeCorsOriginInput(parsedBody.data.origin);
  } catch (error) {
    return respond(apiError(400, "invalid_origin", error instanceof Error ? error.message : "Invalid origin."));
  }

  const origin = await addCorsOrigin(normalizedOrigin);
  invalidateCorsCache();

  return respond(
    NextResponse.json({
      origin: {
        id: origin.id,
        origin: origin.origin,
        createdAt: origin.createdAt.toISOString(),
        updatedAt: origin.updatedAt.toISOString(),
      },
    }),
  );
}
