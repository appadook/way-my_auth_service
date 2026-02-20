import type { WayAuthEndpoints } from "./types";
export declare const WAY_AUTH_DISCOVERY_PATH = "/.well-known/way-auth-configuration";
export declare const WAY_AUTH_DEFAULT_ENDPOINTS: WayAuthEndpoints;
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
export declare function resolveWayAuthConfig(options?: ResolveWayAuthConfigOptions): Promise<WayAuthResolvedConfig>;
export declare function clearWayAuthDiscoveryCache(): void;
//# sourceMappingURL=config.d.ts.map