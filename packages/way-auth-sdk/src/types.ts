export type WayAuthApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type WayAuthUser = {
  id: string;
  email: string;
};

export type WayAuthCredentialInput = {
  email: string;
  password: string;
};

export type WayAuthSignupInputWithConfirm = WayAuthCredentialInput & {
  confirmPassword: string;
};

export type WayAuthErrorCode =
  | "email_taken"
  | "forbidden"
  | "internal_error"
  | "invalid_credentials"
  | "invalid_input"
  | "invalid_json"
  | "invalid_origin"
  | "invalid_refresh_token"
  | "invalid_session_id"
  | "invalid_signup_secret"
  | "invalid_token"
  | "login_failed"
  | "missing_bearer_token"
  | "missing_refresh_token"
  | "rate_limited"
  | "session_not_found"
  | "signup_failed";

export type WayAuthTokenResponse = {
  accessToken: string;
  tokenType: "Bearer" | string;
  expiresIn: number;
};

export type WayAuthSignupResponse = WayAuthTokenResponse & {
  user: WayAuthUser;
};

export type WayAuthLoginResponse = WayAuthTokenResponse & {
  user: WayAuthUser;
};

export type WayAuthRefreshResponse = WayAuthTokenResponse;

export type WayAuthLogoutResponse = {
  success: boolean;
};

export type WayAuthMeResponse = {
  user: WayAuthUser;
  sessionId?: string;
};

export type WayAuthEndpoints = {
  signup: string;
  login: string;
  refresh: string;
  logout: string;
  me: string;
  jwks: string;
};

export type AccessTokenStore = {
  getAccessToken: () => string | null | Promise<string | null>;
  setAccessToken: (token: string | null) => void | Promise<void>;
};
