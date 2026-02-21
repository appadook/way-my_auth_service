import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { emailSchema, passwordSchema } from "@/lib/validation/auth-schemas";
import { validateRefreshSession } from "@/server/auth/auth-service";
import { deleteUserById, findUserById, updateUser } from "@/server/auth/repositories/user-repository";
import { toAdminUser } from "@/server/auth/user-admin";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { apiError, parseJsonWithSchema } from "@/server/http/response";
import { isAdminEmail } from "@/server/security/admin";
import { getRefreshTokenFromRequest } from "@/server/security/cookies";
import { hashPassword } from "@/server/security/password";
import { z } from "zod";

export const runtime = "nodejs";

const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((value) => value.email !== undefined || value.password !== undefined, {
    message: "At least one field must be provided.",
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const respond = (response: NextResponse) => withCors(request, response);

  const authError = await requireAdmin(request);
  if (authError) {
    return respond(authError);
  }

  const params = await context.params;
  const userId = params.id?.trim();
  if (!userId) {
    return respond(apiError(400, "invalid_user_id", "User id is required."));
  }

  const parsedBody = await parseJsonWithSchema(request, updateUserSchema);
  if ("error" in parsedBody) {
    return respond(parsedBody.error);
  }

  try {
    const nextPasswordHash =
      parsedBody.data.password !== undefined ? await hashPassword(parsedBody.data.password) : undefined;

    const updated = await updateUser({
      id: userId,
      email: parsedBody.data.email,
      passwordHash: nextPasswordHash,
    });

    if (!updated) {
      return respond(apiError(404, "user_not_found", "User not found."));
    }

    return respond(NextResponse.json({ user: toAdminUser(updated) }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return respond(apiError(409, "email_taken", "An account with this email already exists."));
    }

    return respond(apiError(500, "internal_error", "Something went wrong."));
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const respond = (response: NextResponse) => withCors(request, response);

  const authError = await requireAdmin(request);
  if (authError) {
    return respond(authError);
  }

  const params = await context.params;
  const userId = params.id?.trim();
  if (!userId) {
    return respond(apiError(400, "invalid_user_id", "User id is required."));
  }

  const existing = await findUserById(userId);
  if (!existing) {
    return respond(apiError(404, "user_not_found", "User not found."));
  }

  await deleteUserById(userId);

  return respond(
    NextResponse.json({
      success: true,
      user: toAdminUser(existing),
    }),
  );
}
