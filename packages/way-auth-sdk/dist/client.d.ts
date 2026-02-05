import type { AccessTokenStore, WayAuthCredentialInput, WayAuthEndpoints, WayAuthLoginResponse, WayAuthLogoutResponse, WayAuthMeResponse, WayAuthRefreshResponse, WayAuthSignupResponse } from "./types";
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
export declare class WayAuthApiError extends Error {
    readonly status: number;
    readonly code: string | null;
    readonly details: unknown;
    constructor(message: string, options: {
        status: number;
        code: string | null;
        details: unknown;
    });
}
export type WayAuthClient = ReturnType<typeof createWayAuthClient>;
export declare function createInMemoryTokenStore(initialToken?: string | null): AccessTokenStore;
export declare function createWayAuthClient(options: WayAuthClientOptions): {
    endpoints: WayAuthEndpoints;
    signup: (input: WayAuthCredentialInput) => Promise<WayAuthSignupResponse>;
    login: (input: WayAuthCredentialInput) => Promise<WayAuthLoginResponse>;
    refresh: () => Promise<WayAuthRefreshResponse>;
    logout: () => Promise<WayAuthLogoutResponse>;
    me: () => Promise<WayAuthMeResponse>;
    fetchWithAuth: (input: string | URL, init?: RequestInit, requestOptions?: ClientRequestOptions) => Promise<Response>;
    getAccessToken: () => Promise<string | null>;
    setAccessToken: (token: string | null) => Promise<void>;
    clearAccessToken: () => Promise<void>;
};
export {};
//# sourceMappingURL=client.d.ts.map