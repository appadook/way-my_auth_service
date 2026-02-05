import { createRemoteJWKSet, customFetch, jwtVerify, } from "jose";
export class WayAuthTokenVerificationError extends Error {
    code;
    constructor(code, message, cause) {
        super(message);
        this.name = "WayAuthTokenVerificationError";
        this.code = code;
        if (cause !== undefined) {
            this.cause = cause;
        }
    }
}
export class WayAuthAuthorizationError extends Error {
    code;
    constructor(message) {
        super(message);
        this.name = "WayAuthAuthorizationError";
        this.code = "forbidden";
    }
}
export function extractBearerToken(authorizationHeader) {
    if (!authorizationHeader) {
        return null;
    }
    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return null;
    }
    return token.trim();
}
export function extractBearerTokenFromRequest(request) {
    return extractBearerToken(request.headers.get("authorization"));
}
export function createWayAuthVerifier(options) {
    const jwksOptions = {};
    if (options.cacheMaxAgeMs !== undefined) {
        jwksOptions.cacheMaxAge = options.cacheMaxAgeMs;
    }
    if (options.timeoutMs !== undefined) {
        jwksOptions.timeoutDuration = options.timeoutMs;
    }
    if (options.headers !== undefined) {
        jwksOptions.headers = options.headers;
    }
    if (options.fetch) {
        jwksOptions[customFetch] = options.fetch;
    }
    const jwks = createRemoteJWKSet(new URL(options.jwksUrl), jwksOptions);
    async function verifyAccessToken(token) {
        try {
            const { payload } = await jwtVerify(token, jwks, {
                issuer: options.issuer,
                audience: options.audience,
                clockTolerance: options.clockTolerance,
            });
            if (typeof payload.sub !== "string" || payload.sub.length === 0) {
                throw new WayAuthTokenVerificationError("invalid_token", "Token is missing a valid subject claim.");
            }
            return payload;
        }
        catch (error) {
            if (error instanceof WayAuthTokenVerificationError) {
                throw error;
            }
            throw new WayAuthTokenVerificationError("invalid_token", "Access token is invalid or expired.", error);
        }
    }
    async function verifyRequest(request) {
        const token = extractBearerTokenFromRequest(request);
        if (!token) {
            throw new WayAuthTokenVerificationError("missing_token", "Authorization Bearer token is required.");
        }
        return verifyAccessToken(token);
    }
    return {
        verifyAccessToken,
        verifyRequest,
    };
}
export function createWayAuthGuard(options) {
    const verifier = createWayAuthVerifier(options);
    async function requireAuth(request) {
        return verifier.verifyRequest(request);
    }
    async function optionalAuth(request) {
        try {
            return await verifier.verifyRequest(request);
        }
        catch (error) {
            if (error instanceof WayAuthTokenVerificationError) {
                return null;
            }
            throw error;
        }
    }
    function assertOwner(auth, ownerId) {
        if (auth.sub !== ownerId) {
            throw new WayAuthAuthorizationError("Authenticated user does not own this resource.");
        }
    }
    return {
        ...verifier,
        requireAuth,
        optionalAuth,
        assertOwner,
    };
}
//# sourceMappingURL=server.js.map