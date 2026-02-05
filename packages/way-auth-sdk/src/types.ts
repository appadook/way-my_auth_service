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

