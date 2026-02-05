import { NextResponse, type NextRequest } from "next/server";
import { handleCorsPreflight, withCors } from "@/server/http/cors";
import { buildJwks } from "@/server/security/jwt";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);

  try {
    return respond(NextResponse.json(await buildJwks()));
  } catch {
    return respond(
      NextResponse.json(
        {
          error: {
            code: "internal_error",
            message: "Unable to build JWKS.",
          },
        },
        { status: 500 },
      ),
    );
  }
}
