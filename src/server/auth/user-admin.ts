import type { User } from "@/generated/prisma/client";

export type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export function toAdminUser(user: User): AdminUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
