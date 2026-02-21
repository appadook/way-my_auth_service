import { randomUUID } from "node:crypto";
import {
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  importPKCS8,
  importSPKI,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { env } from "@/lib/env";

const ACCESS_TOKEN_TTL_SECONDS = env.ACCESS_TOKEN_TTL_SECONDS;
const NORMALIZED_JWT_ISSUER = env.JWT_ISSUER.trim().replace(/\/+$/, "");

let privateKeyPromise: Promise<CryptoKey> | undefined;
let publicKeyPromise: Promise<CryptoKey> | undefined;
let kidPromise: Promise<string> | undefined;

type SignAccessTokenInput = {
  userId: string;
  sessionId: string;
};

type VerifyAccessTokenResult = {
  payload: JWTPayload;
  protectedHeader: { [key: string]: unknown };
};

async function getPrivateKey(): Promise<CryptoKey> {
  if (!privateKeyPromise) {
    privateKeyPromise = importPKCS8(env.JWT_PRIVATE_KEY, "RS256").catch((error: unknown) => {
      throw new Error(
        "Invalid JWT_PRIVATE_KEY format. Expected a valid PKCS#8 RSA private key (PEM or compatible key body).",
        { cause: error instanceof Error ? error : undefined },
      );
    });
  }

  return privateKeyPromise;
}

async function getPublicKey(): Promise<CryptoKey> {
  if (!publicKeyPromise) {
    publicKeyPromise = importSPKI(env.JWT_PUBLIC_KEY, "RS256").catch((error: unknown) => {
      throw new Error(
        "Invalid JWT_PUBLIC_KEY format. Expected a valid SPKI RSA public key (PEM or compatible key body).",
        { cause: error instanceof Error ? error : undefined },
      );
    });
  }

  return publicKeyPromise;
}

async function getKeyId(): Promise<string> {
  if (!kidPromise) {
    kidPromise = (async () => {
      const publicJwk = await exportJWK(await getPublicKey());
      return calculateJwkThumbprint(publicJwk);
    })();
  }

  return kidPromise;
}

export async function signAccessToken(input: SignAccessTokenInput): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const privateKey = await getPrivateKey();
  const kid = await getKeyId();

  const accessToken = await new SignJWT({ sid: input.sessionId })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid })
    .setSubject(input.userId)
    .setIssuer(NORMALIZED_JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(privateKey);

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function verifyAccessToken(token: string): Promise<VerifyAccessTokenResult> {
  const result = await jwtVerify(token, await getPublicKey(), {
    issuer: NORMALIZED_JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  return {
    payload: result.payload,
    protectedHeader: result.protectedHeader,
  };
}

export async function buildJwks(): Promise<{ keys: Array<Record<string, unknown>> }> {
  const publicJwk = await exportJWK(await getPublicKey());
  const kid = await getKeyId();

  return {
    keys: [
      {
        ...publicJwk,
        kid,
        alg: "RS256",
        use: "sig",
      },
    ],
  };
}
