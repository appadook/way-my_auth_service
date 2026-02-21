import type { User } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type CreateUserInput = {
  email: string;
  passwordHash: string;
};

type UpdateUserInput = {
  id: string;
  email?: string;
  passwordHash?: string;
};

export type ListUsersInput = {
  page?: number;
  pageSize?: number;
};

export type ListUsersResult = {
  users: User[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
};

export async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
    },
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

function toPositiveInteger(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

export async function listUsers(input: ListUsersInput = {}): Promise<ListUsersResult> {
  const currentPage = toPositiveInteger(input.page, 1);
  const rawPageSize = toPositiveInteger(input.pageSize, 50);
  const pageSize = Math.min(rawPageSize, 100);
  const skip = (currentPage - 1) * pageSize;

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count(),
  ]);

  return {
    users,
    totalCount,
    currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function updateUser(input: UpdateUserInput): Promise<User | null> {
  const nextData: { email?: string; passwordHash?: string } = {};
  if (input.email !== undefined) {
    nextData.email = input.email;
  }
  if (input.passwordHash !== undefined) {
    nextData.passwordHash = input.passwordHash;
  }

  if (Object.keys(nextData).length === 0) {
    return findUserById(input.id);
  }

  const updated = await prisma.user.updateMany({
    where: { id: input.id },
    data: nextData,
  });

  if (updated.count === 0) {
    return null;
  }

  return findUserById(input.id);
}

export async function deleteUserById(id: string): Promise<boolean> {
  const deleted = await prisma.user.deleteMany({
    where: { id },
  });

  return deleted.count > 0;
}
