import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export function apiError(status: number, code: string, message: string): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export async function parseJsonWithSchema<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse<ApiErrorBody> }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {
      error: apiError(400, "invalid_json", "Request body must be valid JSON."),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      error: apiError(400, "invalid_input", "Request payload is invalid."),
    };
  }

  return { data: parsed.data };
}

