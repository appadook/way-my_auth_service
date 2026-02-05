import type {
  AccessTokenStore,
  WayAuthApiErrorBody,
  WayAuthCredentialInput,
  WayAuthEndpoints,
  WayAuthLoginResponse,
  WayAuthLogoutResponse,
  WayAuthMeResponse,
  WayAuthRefreshResponse,
  WayAuthSignupResponse,
} from "./types";

const DEFAULT_ENDPOINTS: WayAuthEndpoints = {
  signup: "/api/v1/signup",
  login: "/api/v1/login",
  refresh: "/api/v1/refresh",
  logout: "/api/v1/logout",
  me: "/api/v1/me",
  jwks: "/api/v1/jwks",
};
const SIGNUP_SECRET_HEADER = "x-way-signup-secret";

type JsonMethod = "GET" | "POST";

type ClientRequestOptions = {
  retryOn401?: boolean;
};

export type WayAuthClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
  autoRefresh?: boolean;
  tokenStore?: AccessTokenStore;
  endpoints?: Partial<WayAuthEndpoints>;
  signupSecret?: string;
};

export class WayAuthApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: unknown;

  constructor(message: string, options: { status: number; code: string | null; details: unknown }) {
    super(message);
    this.name = "WayAuthApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export type WayAuthClient = ReturnType<typeof createWayAuthClient>;

export function createInMemoryTokenStore(initialToken: string | null = null): AccessTokenStore {
  let token = initialToken;

  return {
    getAccessToken() {
      return token;
    },
    setAccessToken(nextToken) {
      token = nextToken;
    },
  };
}

function isAbsoluteUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function joinUrl(baseUrl: string, path: string): string {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

function normalizeComparableUrl(value: string): string {
  const parsed = new URL(value);
  const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
  return `${parsed.origin}${normalizedPath}`;
}

function resolveRequestUrl(baseUrl: string, input: string | URL): string {
  const value = typeof input === "string" ? input : input.toString();
  return joinUrl(baseUrl, value);
}

async function readErrorResponse(response: Response): Promise<WayAuthApiError> {
  const rawBody = await response.text();
  if (!rawBody) {
    return new WayAuthApiError(`Request failed with status ${response.status}.`, {
      status: response.status,
      code: null,
      details: null,
    });
  }

  try {
    const parsed = JSON.parse(rawBody) as WayAuthApiErrorBody;
    const code = parsed?.error?.code ?? null;
    const message = parsed?.error?.message ?? `Request failed with status ${response.status}.`;

    return new WayAuthApiError(message, {
      status: response.status,
      code,
      details: parsed,
    });
  } catch {
    return new WayAuthApiError(`Request failed with status ${response.status}.`, {
      status: response.status,
      code: null,
      details: rawBody,
    });
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  if (!rawBody) {
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    throw new WayAuthApiError("Expected JSON response body.", {
      status: response.status,
      code: null,
      details: {
        contentType: response.headers.get("content-type"),
        bodyPreview: "",
      },
    });
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new WayAuthApiError("Response body was not valid JSON.", {
      status: response.status,
      code: null,
      details: {
        contentType: response.headers.get("content-type"),
        bodyPreview: rawBody.slice(0, 300),
      },
    });
  }
}

export function createWayAuthClient(options: WayAuthClientOptions) {
  const fetchImpl = options.fetch ?? fetch;
  const credentials = options.credentials ?? "include";
  const autoRefresh = options.autoRefresh ?? true;
  const tokenStore = options.tokenStore ?? createInMemoryTokenStore();
  const signupSecret = options.signupSecret?.trim() || null;
  const endpoints: WayAuthEndpoints = {
    ...DEFAULT_ENDPOINTS,
    ...options.endpoints,
  };

  async function getAccessToken(): Promise<string | null> {
    return tokenStore.getAccessToken();
  }

  async function setAccessToken(token: string | null): Promise<void> {
    await tokenStore.setAccessToken(token);
  }

  async function requestAuthJson<T>(
    method: JsonMethod,
    path: string,
    body?: unknown,
    headers?: HeadersInit,
  ): Promise<T> {
    const requestHeaders = new Headers(headers);
    if (body !== undefined && !requestHeaders.has("content-type")) {
      requestHeaders.set("content-type", "application/json");
    }

    const response = await fetchImpl(joinUrl(options.baseUrl, path), {
      method,
      credentials,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw await readErrorResponse(response);
    }

    return readJsonResponse<T>(response);
  }

  async function signup(input: WayAuthCredentialInput): Promise<WayAuthSignupResponse> {
    const signupHeaders = signupSecret ? { [SIGNUP_SECRET_HEADER]: signupSecret } : undefined;
    const result = await requestAuthJson<WayAuthSignupResponse>("POST", endpoints.signup, input, signupHeaders);
    await setAccessToken(result.accessToken);
    return result;
  }

  async function login(input: WayAuthCredentialInput): Promise<WayAuthLoginResponse> {
    const result = await requestAuthJson<WayAuthLoginResponse>("POST", endpoints.login, input);
    await setAccessToken(result.accessToken);
    return result;
  }

  async function refresh(): Promise<WayAuthRefreshResponse> {
    const result = await requestAuthJson<WayAuthRefreshResponse>("POST", endpoints.refresh);
    await setAccessToken(result.accessToken);
    return result;
  }

  async function logout(): Promise<WayAuthLogoutResponse> {
    try {
      return await requestAuthJson<WayAuthLogoutResponse>("POST", endpoints.logout);
    } finally {
      await setAccessToken(null);
    }
  }

  async function me(): Promise<WayAuthMeResponse> {
    const response = await fetchWithAuth(endpoints.me, {
      method: "GET",
    });

    if (!response.ok) {
      throw await readErrorResponse(response);
    }

    return readJsonResponse<WayAuthMeResponse>(response);
  }

  async function fetchWithAuth(
    input: string | URL,
    init: RequestInit = {},
    requestOptions: ClientRequestOptions = {},
  ): Promise<Response> {
    const url = resolveRequestUrl(options.baseUrl, input);
    const refreshUrl = joinUrl(options.baseUrl, endpoints.refresh);
    const isRefreshRequest = normalizeComparableUrl(url) === normalizeComparableUrl(refreshUrl);
    const headers = new Headers(init.headers);
    const token = await getAccessToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await fetchImpl(url, {
      ...init,
      headers,
      credentials: init.credentials ?? credentials,
    });

    const canRetry =
      autoRefresh &&
      requestOptions.retryOn401 !== false &&
      response.status === 401 &&
      !isRefreshRequest;

    if (!canRetry) {
      return response;
    }

    try {
      await refresh();
    } catch {
      await setAccessToken(null);
      return response;
    }

    const retryHeaders = new Headers(init.headers);
    const retryToken = await getAccessToken();
    if (retryToken) {
      retryHeaders.set("authorization", `Bearer ${retryToken}`);
    }

    return fetchImpl(url, {
      ...init,
      headers: retryHeaders,
      credentials: init.credentials ?? credentials,
    });
  }

  return {
    endpoints,
    signup,
    login,
    refresh,
    logout,
    me,
    fetchWithAuth,
    getAccessToken,
    setAccessToken,
    clearAccessToken: async () => setAccessToken(null),
  };
}
