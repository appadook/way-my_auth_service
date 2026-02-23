export const REFRESH_ERROR_MESSAGES = {
  missing_refresh_token: "Refresh token is required.",
  expired_refresh_token: "Refresh token has expired.",
  invalid_refresh_token: "Refresh token is invalid.",
} as const;

export type RefreshErrorCode = keyof typeof REFRESH_ERROR_MESSAGES;

export function getRefreshErrorMessage(code: RefreshErrorCode): string {
  return REFRESH_ERROR_MESSAGES[code];
}
