import { createInMemoryTokenStore, createWayAuthClient } from "./client";
import { resolveWayAuthConfig } from "./config";
import { getWayAuthErrorMessage } from "./errors";
import { createWayAuthGuard, WayAuthTokenVerificationError } from "./server";
const DEFAULT_ACCESS_TOKEN_COOKIE_NAME = "way_access_token";
const DEFAULT_ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS = 15 * 60;
const DEFAULT_MIDDLEWARE_OPTIONS = {
    adminPrefix: "/admin",
    publicPaths: ["/admin/login", "/admin/signup"],
    loginPath: "/admin/login",
    postLoginPath: "/admin",
    nextParamName: "next",
};
function normalizePath(path) {
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
function isSafeNextTarget(value) {
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
export function sanitizeNextRedirect(value, fallback) {
    return isSafeNextTarget(value) ? value : fallback;
}
function parseCookieValue(cookieHeader, cookieName) {
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
        }
        catch {
            return value;
        }
    }
    return null;
}
function setAccessTokenCookie(cookieName, token, maxAgeSeconds) {
    if (typeof document === "undefined") {
        return;
    }
    const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${cookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureAttribute}`;
}
function clearAccessTokenCookie(cookieName) {
    if (typeof document === "undefined") {
        return;
    }
    const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax${secureAttribute}`;
}
function readUserFromMePayload(payload) {
    if (!payload || typeof payload !== "object") {
        return null;
    }
    const candidate = payload;
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
function toUiError(error) {
    if (error && typeof error === "object" && "code" in error && "status" in error) {
        const candidate = error;
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
function isWithinAdminPrefix(pathname, adminPrefix) {
    return pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`);
}
function getPathnameFromRelativeTarget(target) {
    try {
        const parsed = new URL(target, "https://way-auth.local");
        return normalizePath(parsed.pathname);
    }
    catch {
        return null;
    }
}
function resolveMiddlewareOptions(options) {
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
export function createWayAuthNext(options = {}) {
    const fetchImpl = options.fetch ?? fetch;
    const accessTokenCookieName = options.accessTokenCookieName ?? DEFAULT_ACCESS_TOKEN_COOKIE_NAME;
    const middlewareOptions = resolveMiddlewareOptions(options);
    const defaultHydrationStrategy = options.hydrationStrategy ?? "best-effort";
    const tokenStore = createInMemoryTokenStore();
    let accessTokenCookieMaxAgeSeconds = DEFAULT_ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS;
    const resolvedConfigPromise = resolveWayAuthConfig({
        ...options,
        fetch: fetchImpl,
    });
    let clientPromise = null;
    let guardPromise = null;
    async function getClient() {
        if (!clientPromise) {
            clientPromise = (async () => {
                const resolved = await resolvedConfigPromise;
                const clientOptions = {
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
            setAccessTokenCookie(accessTokenCookieName, token, accessTokenCookieMaxAgeSeconds);
            return;
        }
        clearAccessTokenCookie(accessTokenCookieName);
    }
    async function fetchUserFromMe(accessToken) {
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
        }
        catch {
            return null;
        }
    }
    async function getSession(request, sessionOptions = {}) {
        const hydrationStrategy = sessionOptions.hydrationStrategy ?? defaultHydrationStrategy;
        const accessToken = parseCookieValue(request.headers.get("cookie"), accessTokenCookieName);
        if (!accessToken) {
            return null;
        }
        let claims;
        try {
            claims = await (await getGuard()).verifyAccessToken(accessToken);
        }
        catch {
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
    async function requireSession(request, sessionOptions = {}) {
        const session = await getSession(request, sessionOptions);
        if (session) {
            return session;
        }
        throw new WayAuthTokenVerificationError("missing_token", "Authenticated session is required.");
    }
    async function middleware(request) {
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
            const nextValue = sanitizeNextRedirect(`${request.nextUrl.pathname}${request.nextUrl.search}`, middlewareOptions.postLoginPath);
            redirectUrl.searchParams.set(middlewareOptions.nextParamName, nextValue);
            return Response.redirect(redirectUrl, 307);
        }
        if (isAuthenticated && isPublicPath) {
            const requestedNext = request.nextUrl.searchParams.get(middlewareOptions.nextParamName);
            const candidateTarget = sanitizeNextRedirect(requestedNext, middlewareOptions.postLoginPath);
            const candidatePathname = getPathnameFromRelativeTarget(candidateTarget);
            const redirectTarget = candidatePathname && middlewareOptions.publicPaths.includes(candidatePathname)
                ? middlewareOptions.postLoginPath
                : candidateTarget;
            const redirectUrl = new URL(redirectTarget, request.url);
            return Response.redirect(redirectUrl, 307);
        }
        return undefined;
    }
    async function login(input) {
        const client = await getClient();
        const result = await client.login(input);
        accessTokenCookieMaxAgeSeconds =
            typeof result.expiresIn === "number" && Number.isFinite(result.expiresIn) && result.expiresIn > 0
                ? Math.floor(result.expiresIn)
                : DEFAULT_ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS;
        await syncAccessTokenCookieFromStore();
        return result;
    }
    async function signup(input) {
        const client = await getClient();
        const result = await client.signup(input);
        accessTokenCookieMaxAgeSeconds =
            typeof result.expiresIn === "number" && Number.isFinite(result.expiresIn) && result.expiresIn > 0
                ? Math.floor(result.expiresIn)
                : DEFAULT_ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS;
        await syncAccessTokenCookieFromStore();
        return result;
    }
    async function refresh() {
        const client = await getClient();
        const result = await client.refresh();
        accessTokenCookieMaxAgeSeconds =
            typeof result.expiresIn === "number" && Number.isFinite(result.expiresIn) && result.expiresIn > 0
                ? Math.floor(result.expiresIn)
                : DEFAULT_ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS;
        await syncAccessTokenCookieFromStore();
        return result;
    }
    async function logout() {
        const client = await getClient();
        const result = await client.logout();
        await syncAccessTokenCookieFromStore();
        return result;
    }
    async function bootstrapSession() {
        const client = await getClient();
        try {
            const refreshed = await client.refresh();
            accessTokenCookieMaxAgeSeconds =
                typeof refreshed.expiresIn === "number" && Number.isFinite(refreshed.expiresIn) && refreshed.expiresIn > 0
                    ? Math.floor(refreshed.expiresIn)
                    : DEFAULT_ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS;
            const me = await client.me();
            await syncAccessTokenCookieFromStore();
            return {
                ok: true,
                user: me.user,
                sessionId: me.sessionId,
            };
        }
        catch (error) {
            await client.clearAccessToken();
            clearAccessTokenCookie(accessTokenCookieName);
            return {
                ok: false,
                error: toUiError(error),
            };
        }
    }
    function startSessionKeepAlive(options = {}) {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return () => { };
        }
        const intervalMs = options.intervalMs ?? 5 * 60 * 1_000;
        const runRefresh = () => {
            void refresh().catch(() => {
                // Keep-alive should be best-effort and never throw in global listeners.
            });
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                runRefresh();
            }
        };
        const intervalId = window.setInterval(runRefresh, intervalMs);
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }
    return {
        middleware,
        matcher: middlewareOptions.matcher,
        client: {
            login,
            signup,
            refresh,
            logout,
            bootstrapSession,
            startSessionKeepAlive,
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
//# sourceMappingURL=next.js.map