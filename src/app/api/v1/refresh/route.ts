import type { NextRequest } from "next/server";
import { handleCorsPreflight } from "@/server/http/cors";
import { createRefreshPostHandler } from "@/server/http/refresh-route";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = createRefreshPostHandler();
