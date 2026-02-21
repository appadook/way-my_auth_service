import { type ResolveWayAuthConfigOptions } from "./config";
import { type WayAuthVerifiedToken } from "./server";
import type { WayAuthCredentialInput, WayAuthUser } from "./types";
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
export type WayAuthBootstrapResult = {
    ok: true;
    user: WayAuthUser;
    sessionId?: string;
} | {
    ok: false;
    error: WayAuthUiError;
};
export declare function sanitizeNextRedirect(value: string | null | undefined, fallback: string): string;
declare function toUiError(error: unknown): WayAuthUiError;
export declare function createWayAuthNext(options?: WayAuthNextOptions): {
    middleware: (request: WayAuthMiddlewareRequest) => Promise<Response | undefined>;
    matcher: string[];
    client: {
        login: (input: WayAuthCredentialInput) => Promise<import("./types").WayAuthLoginResponse>;
        signup: (input: WayAuthCredentialInput) => Promise<import("./types").WayAuthSignupResponse>;
        refresh: () => Promise<import("./types").WayAuthTokenResponse>;
        logout: () => Promise<import("./types").WayAuthLogoutResponse>;
        bootstrapSession: () => Promise<WayAuthBootstrapResult>;
        startSessionKeepAlive: (options?: {
            intervalMs?: number;
        }) => () => void;
    };
    server: {
        getSession: (request: Request, sessionOptions?: WayAuthNextSessionOptions) => Promise<WayAuthNextSession | null>;
        requireSession: (request: Request, sessionOptions?: WayAuthNextSessionOptions) => Promise<WayAuthNextSession>;
    };
    errors: {
        toUiError: typeof toUiError;
    };
};
export type WayAuthNext = ReturnType<typeof createWayAuthNext>;
export {};
//# sourceMappingURL=next.d.ts.map