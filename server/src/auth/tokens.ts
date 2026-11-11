import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const accessTokenTtlSeconds = 15 * 60;
export const refreshCookieName = "ajar_refresh";
const refreshCookieMaxAge = 30 * 24 * 60 * 60;

/** Returns a URL-safe random token. Callers store only its hash. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Returns the hex SHA-256 of a token. */
export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Signs a 15-minute access token that carries only the user id and session id. */
export function signAccessToken(
  claims: { sub: string; sid: string },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(
    JSON.stringify({
      sub: claims.sub,
      sid: claims.sid,
      iat: nowSeconds,
      exp: nowSeconds + accessTokenTtlSeconds,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/** Checks the signature and expiry, then returns the user id and session id. */
export function readAccessToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): { sub: string; sid: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad token");
  const [header, body, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("bad token");
  }

  const parsedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as {
    alg?: unknown;
  };
  if (parsedHeader.alg !== "HS256") throw new Error("bad token");

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    sub?: unknown;
    sid?: unknown;
    exp?: unknown;
  };
  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp <= nowSeconds
  ) {
    throw new Error("bad token");
  }
  return { sub: payload.sub, sid: payload.sid };
}

/** Builds the HttpOnly refresh cookie. The path stays on the auth routes. */
export function refreshCookie(token: string): string {
  return [
    `${refreshCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/auth",
    `Max-Age=${refreshCookieMaxAge}`,
  ].join("; ");
}

/** Builds a cookie that removes the refresh token. */
export function clearRefreshCookie(): string {
  return [
    `${refreshCookieName}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/auth",
    "Max-Age=0",
  ].join("; ");
}

/** Reads one cookie value from a Cookie header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const cookieName = part.slice(0, separator).trim();
    if (cookieName !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}
