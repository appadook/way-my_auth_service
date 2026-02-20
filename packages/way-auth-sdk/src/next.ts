import { createInMemoryTokenStore, createWayAuthClient, type WayAuthClientOptions } from "./client";
import { resolveWayAuthConfig, type ResolveWayAuthConfigOptions } from "./config";
import { getWayAuthErrorMessage } from "./errors";
import { createWayAuthGuard, WayAuthTokenVerificationError, type WayAuthVerifiedToken } from "./server";
import type { WayAuthCredentialInput, WayAuthMeResponse, WayAuthUser } from "./types";

type HydrationStrategy = "best-effort" | "required";

export type WayAuthUiError = {
  message: string;
  code: string | null;
  status: number | null;
};

export type WayAuthNextMiddlewareOptions = {
  adminPrefix: string;
  publicPaths: string[];
  loginPath: string;
  postLoginPath: string;
  nextParamName: string;
};

export type WayAuthNextSessionUser = {
  id: string;
  email: string | null;
};

export type WayAuthNextSession = {
  accessToken: string;
  user: WayAuthNextSessionUser;
  claims: WayAuthVerifiedToken;
  source: "claims" | "me";
};

export type WayAuthNextSessionOptions = {
  hydrationStrategy?: HydrationStrategy;
  skipUserHydration?: boolean;
};

type WayAuthMiddlewareRequest = Request & {
  nextUrl: URL;
};

export type WayAuthNextOptions = ResolveWayAuthConfigOptions & {
  accessTokenCookieName?: string;
  clientCredentials?: RequestCredentials;
  clientAutoRefresh?: boolean;
  signupSecret?: string;
  middleware?: Partial<WayAuthNextMiddlewareOptions>;
  hydrationStrategy?: HydrationStrategy;
};

export type WayAuthBootstrapResult =
  | {
      ok: true;
      user: WayAuthUser;
      sessionId?: string;
    }
  | {
      ok: false;
      error: WayAuthUiError;
    };

const DEFAULT_ACCESS_TOKEN_COOKIE_NAME = "way_access_token";
const DEFAULT_MIDDLEWARE_OPTIONS: WayAuthNextMiddlewareOptions = {
  adminPrefix: "/admin",
  publicPaths: ["/admin/login", "/admin/signup"],
  loginPath: "/admin/login",
  postLoginPath: "/admin",
  nextParamName: "next",
};

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }

  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (prefixed.length > 1 && prefixed.endsWith("/")) {
    return prefixed.replace(/\/+$/, "");
  }
  return prefixed;
}

function isSafeNextTarget(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  if (!value.startsWith("/")) {
    return false;
  }

  if (value.startsWith("//")) {
    return false;
  }

  return !value.includes("://");
}

export function sanitizeNextRedirect(value: string | null | undefined, fallback: string): string {
  return isSafeNextTarget(value) ? value : fallback;
}

function parseCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const segments = cookieHeader.split(";");
  for (const segment of segments) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = segment.slice(0, separatorIndex).trim();
    if (key !== cookieName) {
      continue;
    }

    const value = segment.slice(separatorIndex + 1).trim();
    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

function setAccessTokenCookie(cookieName: string, token: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=900; SameSite=Lax${secureAttribute}`;
}

function clearAccessTokenCookie(cookieName: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax${secureAttribute}`;
}

function readUserFromMePayload(payload: unknown): WayAuthUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as WayAuthMeResponse;
  if (!candidate.user || typeof candidate.user !== "object") {
    return null;
  }

  if (typeof candidate.user.id !== "string" || typeof candidate.user.email !== "string") {
    return null;
  }

  return {
    id: candidate.user.id,
    email: candidate.user.email,
  };
}

function toUiError(error: unknown): WayAuthUiError {
  if (error && typeof error === "object" && "code" in error && "status" in error) {
    const candidate = error as { code?: unknown; status?: unknown };
    return {
      message: getWayAuthErrorMessage(error),
      code: typeof candidate.code === "string" ? candidate.code : null,
      status: typeof candidate.status === "number" ? candidate.status : null,
    };
  }

  return {
    message: getWayAuthErrorMessage(error),
    code: null,
    status: null,
  };
}

function isWithinAdminPrefix(pathname: string, adminPrefix: string): boolean {
  return pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`);
}

function getPathnameFromRelativeTarget(target: string): string | null {
  try {
    const parsed = new URL(target, "https://way-auth.local");
    return normalizePath(parsed.pathname);
  } catch {
    return null;
  }
}

function resolveMiddlewareOptions(
  options: WayAuthNextOptions,
): WayAuthNextMiddlewareOptions & { matcher: string[] } {
  const merged = {
    ...DEFAULT_MIDDLEWARE_OPTIONS,
    ...options.middleware,
  };

  const adminPrefix = normalizePath(merged.adminPrefix);
  const loginPath = normalizePath(merged.loginPath);
  const postLoginPath = normalizePath(merged.postLoginPath);
  const publicPaths = Array.from(new Set(merged.publicPaths.map((path) => normalizePath(path))));

  return {
    adminPrefix,
    publicPaths,
    loginPath,
    postLoginPath,
    nextParamName: merged.nextParamName,
    matcher: [`${adminPrefix}/:path*`],
  };
}

export function createWayAuthNext(options: WayAuthNextOptions = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const accessTokenCookieName = options.accessTokenCookieName ?? DEFAULT_ACCESS_TOKEN_COOKIE_NAME;
  const middlewareOptions = resolveMiddlewareOptions(options);
  const defaultHydrationStrategy = options.hydrationStrategy ?? "best-effort";
  const tokenStore = createInMemoryTokenStore();

  const resolvedConfigPromise = resolveWayAuthConfig({
    ...options,
    fetch: fetchImpl,
  });

  let clientPromise: Promise<ReturnType<typeof createWayAuthClient>> | null = null;
  let guardPromise: Promise<ReturnType<typeof createWayAuthGuard>> | null = null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const resolved = await resolvedConfigPromise;
        const clientOptions: WayAuthClientOptions = {
          baseUrl: resolved.baseUrl,
          fetch: fetchImpl,
          credentials: options.clientCredentials ?? "include",
          autoRefresh: options.clientAutoRefresh ?? true,
          tokenStore,
          endpoints: resolved.endpoints,
          signupSecret: options.signupSecret,
        };
        return createWayAuthClient(clientOptions);
      })();
    }

    return clientPromise;
  }

  async function getGuard() {
    if (!guardPromise) {
      guardPromise = (async () => {
        const resolved = await resolvedConfigPromise;
        return createWayAuthGuard({
          jwksUrl: resolved.jwksUrl,
          issuer: resolved.issuer,
          audience: resolved.audience,
          fetch: (url, requestOptions) => fetchImpl(url, requestOptions),
        });
      })();
    }

    return guardPromise;
  }

  async function syncAccessTokenCookieFromStore() {
    const token = await tokenStore.getAccessToken();
    if (token) {
      setAccessTokenCookie(accessTokenCookieName, token);
      return;
    }

    clearAccessTokenCookie(accessTokenCookieName);
  }

  async function fetchUserFromMe(accessToken: string): Promise<WayAuthUser | null> {
    const resolved = await resolvedConfigPromise;
    try {
      const response = await fetchImpl(resolved.endpoints.me, {
        method: "GET",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return readUserFromMePayload(payload);
    } catch {
      return null;
    }
  }

  async function getSession(
    request: Request,
    sessionOptions: WayAuthNextSessionOptions = {},
  ): Promise<WayAuthNextSession | null> {
    const hydrationStrategy = sessionOptions.hydrationStrategy ?? defaultHydrationStrategy;
    const accessToken = parseCookieValue(request.headers.get("cookie"), accessTokenCookieName);
    if (!accessToken) {
      return null;
    }

    let claims: WayAuthVerifiedToken;
    try {
      claims = await (await getGuard()).verifyAccessToken(accessToken);
    } catch {
      return null;
    }

    if (sessionOptions.skipUserHydration) {
      return {
        accessToken,
        claims,
        user: {
          id: claims.sub,
          email: null,
        },
        source: "claims",
      };
    }

    const meUser = await fetchUserFromMe(accessToken);
    if (meUser) {
      return {
        accessToken,
        claims,
        user: {
          id: meUser.id,
          email: meUser.email,
        },
        source: "me",
      };
    }

    if (hydrationStrategy === "required") {
      return null;
    }

    return {
      accessToken,
      claims,
      user: {
        id: claims.sub,
        email: null,
      },
      source: "claims",
    };
  }

  async function requireSession(
    request: Request,
    sessionOptions: WayAuthNextSessionOptions = {},
  ): Promise<WayAuthNextSession> {
    const session = await getSession(request, sessionOptions);
    if (session) {
      return session;
    }

    throw new WayAuthTokenVerificationError("missing_token", "Authenticated session is required.");
  }

  async function middleware(request: WayAuthMiddlewareRequest): Promise<Response | undefined> {
    const pathname = request.nextUrl.pathname;
    if (!isWithinAdminPrefix(pathname, middlewareOptions.adminPrefix)) {
      return undefined;
    }

    const isPublicPath = middlewareOptions.publicPaths.includes(normalizePath(pathname));
    const session = await getSession(request, {
      skipUserHydration: true,
      hydrationStrategy: "best-effort",
    });
    const isAuthenticated = Boolean(session);

    if (!isAuthenticated && !isPublicPath) {
      const redirectUrl = new URL(middlewareOptions.loginPath, request.url);
      const nextValue = sanitizeNextRedirect(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
        middlewareOptions.postLoginPath,
      );
      redirectUrl.searchParams.set(middlewareOptions.nextParamName, nextValue);
      return Response.redirect(redirectUrl, 307);
    }

    if (isAuthenticated && isPublicPath) {
      const requestedNext = request.nextUrl.searchParams.get(middlewareOptions.nextParamName);
      const candidateTarget = sanitizeNextRedirect(requestedNext, middlewareOptions.postLoginPath);
      const candidatePathname = getPathnameFromRelativeTarget(candidateTarget);
      const redirectTarget =
        candidatePathname && middlewareOptions.publicPaths.includes(candidatePathname)
          ? middlewareOptions.postLoginPath
          : candidateTarget;
      const redirectUrl = new URL(redirectTarget, request.url);
      return Response.redirect(redirectUrl, 307);
    }

    return undefined;
  }

  async function login(input: WayAuthCredentialInput) {
    const client = await getClient();
    const result = await client.login(input);
    await syncAccessTokenCookieFromStore();
    return result;
  }

  async function signup(input: WayAuthCredentialInput) {
    const client = await getClient();
    const result = await client.signup(input);
    await syncAccessTokenCookieFromStore();
    return result;
  }

  async function logout() {
    const client = await getClient();
    const result = await client.logout();
    await syncAccessTokenCookieFromStore();
    return result;
  }

  async function bootstrapSession(): Promise<WayAuthBootstrapResult> {
    const client = await getClient();
    try {
      await client.refresh();
      const me = await client.me();
      await syncAccessTokenCookieFromStore();
      return {
        ok: true,
        user: me.user,
        sessionId: me.sessionId,
      };
    } catch (error) {
      await client.clearAccessToken();
      clearAccessTokenCookie(accessTokenCookieName);
      return {
        ok: false,
        error: toUiError(error),
      };
    }
  }

  return {
    middleware,
    matcher: middlewareOptions.matcher,
    client: {
      login,
      signup,
      logout,
      bootstrapSession,
    },
    server: {
      getSession,
      requireSession,
    },
    errors: {
      toUiError,
    },
  };
}

export type WayAuthNext = ReturnType<typeof createWayAuthNext>;
