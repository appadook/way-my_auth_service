import type { WayAuthEndpoints } from "./types";

export const WAY_AUTH_DISCOVERY_PATH = "/.well-known/way-auth-configuration";

export const WAY_AUTH_DEFAULT_ENDPOINTS: WayAuthEndpoints = {
  signup: "/api/v1/signup",
  login: "/api/v1/login",
  refresh: "/api/v1/refresh",
  logout: "/api/v1/logout",
  me: "/api/v1/me",
  jwks: "/api/v1/jwks",
};

export type WayAuthDiscoveryMode = "auto" | "always" | "never";

export type WayAuthDiscoveryDocument = {
  version: string;
  issuer: string;
  audience: string;
  jwks_url: string;
  endpoints: Pick<WayAuthEndpoints, "signup" | "login" | "refresh" | "logout" | "me">;
};

export type ResolveWayAuthConfigOptions = {
  baseUrl?: string;
  issuer?: string;
  audience?: string;
  jwksUrl?: string;
  endpoints?: Partial<WayAuthEndpoints>;
  discoveryMode?: WayAuthDiscoveryMode;
  discoveryCacheTtlMs?: number;
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
};

export type WayAuthResolvedConfig = {
  baseUrl: string;
  issuer: string;
  audience: string;
  jwksUrl: string;
  endpoints: WayAuthEndpoints;
  discovery: {
    mode: WayAuthDiscoveryMode;
    used: boolean;
    version: string | null;
    url: string;
  };
};

type DiscoveryCacheEntry = {
  expiresAt: number;
  value: WayAuthDiscoveryDocument | null;
};

const DEFAULT_DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1_000;
const discoveryCache = new Map<string, DiscoveryCacheEntry>();

function isAbsoluteUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function joinUrl(baseUrl: string, pathOrUrl: string): string {
  if (isAbsoluteUrl(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

function getRuntimeEnv(name: string, localEnv?: Record<string, string | undefined>): string | undefined {
  if (localEnv && name in localEnv) {
    return localEnv[name];
  }

  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }

  return undefined;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("WAY Auth base URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("WAY Auth base URL must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("WAY Auth base URL must use http or https.");
  }

  return parsed.origin;
}

function normalizeIssuerUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("WAY Auth issuer is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("WAY Auth issuer must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("WAY Auth issuer must use http or https.");
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${normalizedPath}`;
}

function normalizeMaybeUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.trim();
}

function asStringRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseDiscoveryDocument(payload: unknown): WayAuthDiscoveryDocument | null {
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

async function loadDiscoveryDocument(
  discoveryUrl: string,
  fetchImpl: typeof fetch,
  cacheTtlMs: number,
): Promise<WayAuthDiscoveryDocument | null> {
  const now = Date.now();
  const cached = discoveryCache.get(discoveryUrl);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let document: WayAuthDiscoveryDocument | null = null;
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
  } catch {
    document = null;
  }

  discoveryCache.set(discoveryUrl, {
    value: document,
    expiresAt: now + cacheTtlMs,
  });

  return document;
}

function normalizeEndpoints(
  baseUrl: string,
  discovery: WayAuthDiscoveryDocument | null,
  explicitEndpoints?: Partial<WayAuthEndpoints>,
): WayAuthEndpoints {
  const discoveryEndpoints: Partial<WayAuthEndpoints> = discovery
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

export async function resolveWayAuthConfig(options: ResolveWayAuthConfigOptions = {}): Promise<WayAuthResolvedConfig> {
  const envBaseUrl =
    getRuntimeEnv("WAY_AUTH_BASE_URL", options.env) ??
    getRuntimeEnv("NEXT_PUBLIC_WAY_AUTH_BASE_URL", options.env);
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? envBaseUrl ?? "");

  const fetchImpl = options.fetch ?? fetch;
  const discoveryMode = options.discoveryMode ?? "auto";
  const discoveryUrl = joinUrl(baseUrl, WAY_AUTH_DISCOVERY_PATH);
  const discoveryCacheTtlMs = options.discoveryCacheTtlMs ?? DEFAULT_DISCOVERY_CACHE_TTL_MS;

  let discoveryDocument: WayAuthDiscoveryDocument | null = null;
  if (discoveryMode !== "never") {
    discoveryDocument = await loadDiscoveryDocument(discoveryUrl, fetchImpl, discoveryCacheTtlMs);
    if (!discoveryDocument && discoveryMode === "always") {
      throw new Error(
        `WAY Auth discovery is required in "always" mode, but ${discoveryUrl} was unavailable or invalid.`,
      );
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

export function clearWayAuthDiscoveryCache(): void {
  discoveryCache.clear();
}
