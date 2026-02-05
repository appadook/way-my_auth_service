import { env } from "@/lib/env";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const adminEmails = new Set(
  env.ADMIN_EMAILS.split(",")
    .map((email) => normalizeEmail(email))
    .filter((email) => email.length > 0),
);

export function isAdminEmail(email: string): boolean {
  return adminEmails.has(normalizeEmail(email));
}

export function getAdminEmailList(): string[] {
  return Array.from(adminEmails.values());
}
