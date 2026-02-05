import { type JWTPayload, type JWTVerifyOptions } from "jose";
export type WayAuthVerifiedToken = JWTPayload & {
    sub: string;
    sid?: string;
};
export type WayAuthVerifierOptions = {
    jwksUrl: string;
    issuer: string;
    audience: string | string[];
    clockTolerance?: JWTVerifyOptions["clockTolerance"];
    cacheMaxAgeMs?: number;
    timeoutMs?: number;
    headers?: Record<string, string>;
    fetch?: (url: string, options: RequestInit) => Promise<Response>;
};
export declare class WayAuthTokenVerificationError extends Error {
    readonly code: "missing_token" | "invalid_token";
    constructor(code: "missing_token" | "invalid_token", message: string, cause?: unknown);
}
export declare class WayAuthAuthorizationError extends Error {
    readonly code: "forbidden";
    constructor(message: string);
}
export declare function extractBearerToken(authorizationHeader: string | null | undefined): string | null;
export declare function extractBearerTokenFromRequest(request: Request): string | null;
export declare function createWayAuthVerifier(options: WayAuthVerifierOptions): {
    verifyAccessToken: (token: string) => Promise<WayAuthVerifiedToken>;
    verifyRequest: (request: Request) => Promise<WayAuthVerifiedToken>;
};
export declare function createWayAuthGuard(options: WayAuthVerifierOptions): {
    requireAuth: (request: Request) => Promise<WayAuthVerifiedToken>;
    optionalAuth: (request: Request) => Promise<WayAuthVerifiedToken | null>;
    assertOwner: (auth: Pick<WayAuthVerifiedToken, "sub">, ownerId: string) => void;
    verifyAccessToken: (token: string) => Promise<WayAuthVerifiedToken>;
    verifyRequest: (request: Request) => Promise<WayAuthVerifiedToken>;
};
//# sourceMappingURL=server.d.ts.map