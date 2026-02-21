import { describe, expect, test } from "bun:test";
import { toAdminUser } from "../src/server/auth/user-admin";

describe("toAdminUser", () => {
  test("maps prisma user to safe admin user payload", () => {
    const user = {
      id: "user_123",
      email: "demo@example.com",
      passwordHash: "$argon2id$redacted",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };

    expect(toAdminUser(user)).toEqual({
      id: "user_123",
      email: "demo@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
});
