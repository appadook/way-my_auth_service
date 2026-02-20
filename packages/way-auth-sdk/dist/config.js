export const WAY_AUTH_DISCOVERY_PATH = "/.well-known/way-auth-configuration";
export const WAY_AUTH_DEFAULT_ENDPOINTS = {
    signup: "/api/v1/signup",
    login: "/api/v1/login",
    refresh: "/api/v1/refresh",
    logout: "/api/v1/logout",
    me: "/api/v1/me",
    jwks: "/api/v1/jwks",
};
const DEFAULT_DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1_000;
const discoveryCache = new Map();
function isAbsoluteUrl(value) {
    return value.startsWith("http://") || value.startsWith("https://");
}
function joinUrl(baseUrl, pathOrUrl) {
    if (isAbsoluteUrl(pathOrUrl)) {
        return pathOrUrl;
    }
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
}
function getRuntimeEnv(name, localEnv) {
    if (localEnv && name in localEnv) {
        return localEnv[name];
    }
    if (typeof process !== "undefined" && process.env) {
        return process.env[name];
    }
    return undefined;
}
function normalizeBaseUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error("WAY Auth base URL is required.");
    }
    let parsed;
    try {
        parsed = new URL(trimmed);
    }
    catch {
        throw new Error("WAY Auth base URL must be a valid URL.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("WAY Auth base URL must use http or https.");
    }
    return parsed.origin;
}
function normalizeIssuerUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error("WAY Auth issuer is required.");
    }
    let parsed;
    try {
        parsed = new URL(trimmed);
    }
    catch {
        throw new Error("WAY Auth issuer must be a valid URL.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("WAY Auth issuer must use http or https.");
    }
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${normalizedPath}`;
}
function normalizeMaybeUrl(value) {
    if (!value) {
        return undefined;
    }
    return value.trim();
}
function asStringRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value;
}
function parseDiscoveryDocument(payload) {
    const record = asStringRecord(payload);
    if (!record) {
        return null;
    }
    const endpointsRecord = asStringRecord(record.endpoints);
    if (!endpointsRecord) {
        return null;
    }
    const version = typeof record.version === "string" ? record.version.trim() : "";
    const issuer = typeof record.issuer === "string" ? record.issuer.trim() : "";
    const audience = typeof record.audience === "string" ? record.audience.trim() : "";
    const jwksUrl = typeof record.jwks_url === "string" ? record.jwks_url.trim() : "";
    const signup = typeof endpointsRecord.signup === "string" ? endpointsRecord.signup.trim() : "";
    const login = typeof endpointsRecord.login === "string" ? endpointsRecord.login.trim() : "";
    const refresh = typeof endpointsRecord.refresh === "string" ? endpointsRecord.refresh.trim() : "";
    const logout = typeof endpointsRecord.logout === "string" ? endpointsRecord.logout.trim() : "";
    const me = typeof endpointsRecord.me === "string" ? endpointsRecord.me.trim() : "";
    if (!version || !issuer || !audience || !jwksUrl || !signup || !login || !refresh || !logout || !me) {
        return null;
    }
    return {
        version,
        issuer,
        audience,
        jwks_url: jwksUrl,
        endpoints: {
            signup,
            login,
            refresh,
            logout,
            me,
        },
    };
}
async function loadDiscoveryDocument(discoveryUrl, fetchImpl, cacheTtlMs) {
    const now = Date.now();
    const cached = discoveryCache.get(discoveryUrl);
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }
    let document = null;
    try {
        const response = await fetchImpl(discoveryUrl, {
            method: "GET",
            headers: {
                accept: "application/json",
            },
        });
        if (response.ok) {
            const payload = await response.json();
            document = parseDiscoveryDocument(payload);
        }
    }
    catch {
        document = null;
    }
    discoveryCache.set(discoveryUrl, {
        value: document,
        expiresAt: now + cacheTtlMs,
    });
    return document;
}
function normalizeEndpoints(baseUrl, discovery, explicitEndpoints) {
    const discoveryEndpoints = discovery
        ? {
            ...discovery.endpoints,
            jwks: discovery.jwks_url,
        }
        : {};
    const merged = {
        ...WAY_AUTH_DEFAULT_ENDPOINTS,
        ...discoveryEndpoints,
        ...explicitEndpoints,
    };
    return {
        signup: joinUrl(baseUrl, merged.signup),
        login: joinUrl(baseUrl, merged.login),
        refresh: joinUrl(baseUrl, merged.refresh),
        logout: joinUrl(baseUrl, merged.logout),
        me: joinUrl(baseUrl, merged.me),
        jwks: joinUrl(baseUrl, merged.jwks),
    };
}
export async function resolveWayAuthConfig(options = {}) {
    const envBaseUrl = getRuntimeEnv("WAY_AUTH_BASE_URL", options.env) ??
        getRuntimeEnv("NEXT_PUBLIC_WAY_AUTH_BASE_URL", options.env);
    const baseUrl = normalizeBaseUrl(options.baseUrl ?? envBaseUrl ?? "");
    const fetchImpl = options.fetch ?? fetch;
    const discoveryMode = options.discoveryMode ?? "auto";
    const discoveryUrl = joinUrl(baseUrl, WAY_AUTH_DISCOVERY_PATH);
    const discoveryCacheTtlMs = options.discoveryCacheTtlMs ?? DEFAULT_DISCOVERY_CACHE_TTL_MS;
    let discoveryDocument = null;
    if (discoveryMode !== "never") {
        discoveryDocument = await loadDiscoveryDocument(discoveryUrl, fetchImpl, discoveryCacheTtlMs);
        if (!discoveryDocument && discoveryMode === "always") {
            throw new Error(`WAY Auth discovery is required in "always" mode, but ${discoveryUrl} was unavailable or invalid.`);
        }
    }
    const issuerFromEnv = normalizeMaybeUrl(getRuntimeEnv("WAY_AUTH_ISSUER", options.env));
    const audienceFromEnv = normalizeMaybeUrl(getRuntimeEnv("WAY_AUTH_AUDIENCE", options.env));
    const jwksFromEnv = normalizeMaybeUrl(getRuntimeEnv("WAY_AUTH_JWKS_URL", options.env));
    const issuer = normalizeIssuerUrl(options.issuer ?? issuerFromEnv ?? discoveryDocument?.issuer ?? baseUrl);
    const audience = options.audience?.trim() || audienceFromEnv || discoveryDocument?.audience || "way-clients";
    const jwksUrl = joinUrl(baseUrl, options.jwksUrl ?? jwksFromEnv ?? discoveryDocument?.jwks_url ?? WAY_AUTH_DEFAULT_ENDPOINTS.jwks);
    const endpoints = normalizeEndpoints(baseUrl, discoveryDocument, options.endpoints);
    return {
        baseUrl,
        issuer,
        audience,
        jwksUrl,
        endpoints: {
            ...endpoints,
            jwks: jwksUrl,
        },
        discovery: {
            mode: discoveryMode,
            used: Boolean(discoveryDocument),
            version: discoveryDocument?.version ?? null,
            url: discoveryUrl,
        },
    };
}
export function clearWayAuthDiscoveryCache() {
    discoveryCache.clear();
}
//# sourceMappingURL=config.js.map