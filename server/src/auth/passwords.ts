import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const cost = { N: 16384, r: 8, p: 1 } as const;
const keyLength = 32;

/** Runs scrypt without blocking the request thread. */
function scryptAsync(
  password: string,
  salt: Buffer,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

let dummyHash: Promise<string> | undefined;

/** Stores a password as scrypt parameters, salt, and hash. The password itself is not kept. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, cost);
  return encode(cost.N, cost.r, cost.p, salt.toString("base64url"), hash.toString("base64url"));
}

/** Checks a password against a stored scrypt hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || n < 16384 || n > 131072) return false;
  if (r !== 8 || p !== 1) return false;
  const derived = await scryptAsync(password, Buffer.from(parts[4], "base64url"), {
    N: n,
    r,
    p,
  });
  const expected = Buffer.from(parts[5], "base64url");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Prepares the shared unknown-account hash once. Later callers reuse that promise. */
export function prepareDummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password");
  return dummyHash;
}

/** A valid hash used when no account exists, so the check takes the same work. */
export function dummyPasswordHash(): Promise<string> {
  return prepareDummyPasswordHash();
}

/** Joins the stored hash parts. */
function encode(n: number, r: number, p: number, salt: string, hash: string): string {
  return `scrypt$${n}$${r}$${p}$${salt}$${hash}`;
}
