import { WayAuthApiError } from "./client";
import type { WayAuthErrorCode } from "./types";

export const WAY_AUTH_ERROR_MESSAGES: Record<WayAuthErrorCode, string> = {
  email_taken: "An account with this email already exists.",
  forbidden: "You are not authorized to access this resource.",
  internal_error: "Something went wrong.",
  invalid_credentials: "Email or password is incorrect.",
  invalid_input: "Request payload is invalid.",
  invalid_json: "Request body must be valid JSON.",
  invalid_origin: "Origin is invalid.",
  invalid_refresh_token: "Refresh token is invalid or expired.",
  invalid_session_id: "Session id is required.",
  invalid_signup_secret: "Signup is restricted. Provide a valid signup secret.",
  invalid_token: "Access token is invalid or expired.",
  login_failed: "Unable to log in.",
  missing_bearer_token: "Authorization Bearer token is required.",
  missing_refresh_token: "Refresh token is required.",
  rate_limited: "Too many requests. Please try again shortly.",
  session_not_found: "Session not found.",
  signup_failed: "Unable to create account.",
};

export function getWayAuthErrorMessage(error: unknown, fallback: string = "Unexpected authentication error."): string {
  if (error instanceof WayAuthApiError) {
    const code = error.code as WayAuthErrorCode | null;
    if (code && code in WAY_AUTH_ERROR_MESSAGES) {
      return WAY_AUTH_ERROR_MESSAGES[code];
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}
