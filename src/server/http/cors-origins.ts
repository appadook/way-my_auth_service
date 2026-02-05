import { prisma } from "@/server/db/prisma";

export type CorsOrigin = {
  id: string;
  origin: string;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeCorsOriginInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Origin is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Origin must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Origin must use http or https.");
  }

  return parsed.origin;
}

export async function listCorsOrigins(): Promise<CorsOrigin[]> {
  return prisma.corsOrigin.findMany({
    orderBy: { origin: "asc" },
  });
}

export async function addCorsOrigin(origin: string): Promise<CorsOrigin> {
  return prisma.corsOrigin.upsert({
    where: { origin },
    update: {},
    create: { origin },
  });
}

export async function removeCorsOrigin(id: string): Promise<void> {
  await prisma.corsOrigin.deleteMany({
    where: { id },
  });
}
