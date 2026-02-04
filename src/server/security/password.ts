import argon2 from "argon2";

const PASSWORD_HASH_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

export async function verifyPassword(passwordHash: string, candidatePassword: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, candidatePassword);
  } catch {
    return false;
  }
}

