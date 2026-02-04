import { NextResponse } from "next/server";
import { buildJwks } from "@/server/security/jwt";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await buildJwks());
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "internal_error",
          message: "Unable to build JWKS.",
        },
      },
      { status: 500 },
    );
  }
}

