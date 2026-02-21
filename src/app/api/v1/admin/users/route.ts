import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { emailSchema, passwordSchema } from "@/lib/validation/auth-schemas";
import { validateRefreshSession } from "@/server/auth/auth-service";
import { createUser, listUsers } from "@/server/auth/repositories/user-repository";
import { toAdminUser } from "@/server/auth/user-admin";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { apiError, parseJsonWithSchema } from "@/server/http/response";
import { getRefreshTokenFromRequest } from "@/server/security/cookies";
import { isAdminEmail } from "@/server/security/admin";
import { hashPassword } from "@/server/security/password";
import { z } from "zod";

export const runtime = "nodejs";

const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
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

  try {
    const authError = await requireAdmin(request);
    if (authError) {
      return respond(authError);
    }

    const { searchParams } = new URL(request.url);
    const pageParam = Number(searchParams.get("page"));
    const pageSizeParam = Number(searchParams.get("pageSize"));

    const users = await listUsers({
      page: Number.isFinite(pageParam) ? pageParam : undefined,
      pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : undefined,
    });

    return respond(
      NextResponse.json({
        users: users.users.map((user) => toAdminUser(user)),
        currentPage: users.currentPage,
        pageSize: users.pageSize,
        totalCount: users.totalCount,
        totalPages: users.totalPages,
      }),
    );
  } catch {
    return respond(apiError(500, "internal_error", "Something went wrong."));
  }
}

export async function POST(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);

  const authError = await requireAdmin(request);
  if (authError) {
    return respond(authError);
  }

  const parsedBody = await parseJsonWithSchema(request, createUserSchema);
  if ("error" in parsedBody) {
    return respond(parsedBody.error);
  }

  try {
    const passwordHash = await hashPassword(parsedBody.data.password);
    const user = await createUser({
      email: parsedBody.data.email,
      passwordHash,
    });

    return respond(NextResponse.json({ user: toAdminUser(user) }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return respond(apiError(409, "email_taken", "An account with this email already exists."));
    }

    return respond(apiError(500, "internal_error", "Something went wrong."));
  }
}
