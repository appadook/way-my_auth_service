import { NextResponse, type NextRequest } from "next/server";
import { handleCorsPreflight, withCors } from "@/server/http/cors";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const respond = (response: NextResponse) => withCors(request, response);

  if (process.env.NODE_ENV !== "development") {
    return respond(
      NextResponse.json(
        {
          error: {
            code: "not_found",
            message: "Not found.",
          },
        },
        { status: 404 },
      ),
    );
  }

  const cookieName = process.env.REFRESH_COOKIE_NAME ?? "way_refresh";
  const present = Boolean(request.cookies.get(cookieName)?.value);

  return respond(NextResponse.json({
    cookieName,
    present,
    checkedAt: new Date().toISOString(),
  }));
}
