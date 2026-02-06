import type { WayAuthSignupInputWithConfirm } from "./types";

export type PasswordConfirmationResult = { ok: true } | { ok: false; message: string };

export function validatePasswordConfirmation(input: WayAuthSignupInputWithConfirm): PasswordConfirmationResult {
  if (!input.password || !input.confirmPassword) {
    return { ok: false, message: "Password and confirmation are required." };
  }

  if (input.password !== input.confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  return { ok: true };
}
