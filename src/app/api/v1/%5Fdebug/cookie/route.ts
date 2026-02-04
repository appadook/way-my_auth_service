import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        error: {
          code: "not_found",
          message: "Not found.",
        },
      },
      { status: 404 },
    );
  }

  const cookieName = process.env.REFRESH_COOKIE_NAME ?? "way_refresh";
  const present = Boolean(request.cookies.get(cookieName)?.value);

  return NextResponse.json({
    cookieName,
    present,
    checkedAt: new Date().toISOString(),
  });
}

