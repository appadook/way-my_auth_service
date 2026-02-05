import CorsAdminClient from "./cors-admin-client";
import { listCorsOrigins } from "@/server/http/cors-origins";

export const runtime = "nodejs";

export default async function CorsAdminPage() {
  const origins = await listCorsOrigins();

  return (
    <CorsAdminClient
      initialOrigins={origins.map((origin) => ({
        id: origin.id,
        origin: origin.origin,
        createdAt: origin.createdAt.toISOString(),
        updatedAt: origin.updatedAt.toISOString(),
      }))}
    />
  );
}
