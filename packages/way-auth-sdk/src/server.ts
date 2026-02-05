import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyOptions,
} from "jose";

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

export class WayAuthTokenVerificationError extends Error {
  readonly code: "missing_token" | "invalid_token";

  constructor(code: "missing_token" | "invalid_token", message: string, cause?: unknown) {
    super(message);
    this.name = "WayAuthTokenVerificationError";
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class WayAuthAuthorizationError extends Error {
  readonly code: "forbidden";

  constructor(message: string) {
    super(message);
    this.name = "WayAuthAuthorizationError";
    this.code = "forbidden";
  }
}

export function extractBearerToken(authorizationHeader: string | null | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export function extractBearerTokenFromRequest(request: Request): string | null {
  return extractBearerToken(request.headers.get("authorization"));
}

export function createWayAuthVerifier(options: WayAuthVerifierOptions) {
  const jwksOptions: NonNullable<Parameters<typeof createRemoteJWKSet>[1]> = {};

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

  async function verifyAccessToken(token: string): Promise<WayAuthVerifiedToken> {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: options.issuer,
        audience: options.audience,
        clockTolerance: options.clockTolerance,
      });

      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new WayAuthTokenVerificationError("invalid_token", "Token is missing a valid subject claim.");
      }

      return payload as WayAuthVerifiedToken;
    } catch (error) {
      if (error instanceof WayAuthTokenVerificationError) {
        throw error;
      }

      throw new WayAuthTokenVerificationError("invalid_token", "Access token is invalid or expired.", error);
    }
  }

  async function verifyRequest(request: Request): Promise<WayAuthVerifiedToken> {
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

export function createWayAuthGuard(options: WayAuthVerifierOptions) {
  const verifier = createWayAuthVerifier(options);

  async function requireAuth(request: Request): Promise<WayAuthVerifiedToken> {
    return verifier.verifyRequest(request);
  }

  async function optionalAuth(request: Request): Promise<WayAuthVerifiedToken | null> {
    try {
      return await verifier.verifyRequest(request);
    } catch (error) {
      if (error instanceof WayAuthTokenVerificationError) {
        return null;
      }

      throw error;
    }
  }

  function assertOwner(auth: Pick<WayAuthVerifiedToken, "sub">, ownerId: string): void {
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
