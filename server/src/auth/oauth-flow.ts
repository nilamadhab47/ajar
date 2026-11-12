import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
  type JsonWebKey,
} from "node:crypto";

export type OAuthProvider = "google" | "microsoft";

export type OAuthCookie = {
  provider: OAuthProvider;
  state: string;
  verifier: string;
};

export type ProviderIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

const oauthCookieTtlSeconds = 10 * 60;

/** Builds a PKCE pair. The verifier stays on the server and the challenge goes to the provider. */
export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/** Creates the value stored in the short-lived OAuth cookie. */
export function sealOauthCookie(payload: OAuthCookie, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

/** Returns the cookie payload when the signature matches. */
export function openOauthCookie(value: string, secret: string): OAuthCookie | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const body = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<OAuthCookie>;
    if (
      (parsed.provider !== "google" && parsed.provider !== "microsoft") ||
      typeof parsed.state !== "string" ||
      typeof parsed.verifier !== "string"
    ) {
      return null;
    }
    return { provider: parsed.provider, state: parsed.state, verifier: parsed.verifier };
  } catch {
    return null;
  }
}

/** Builds the Set-Cookie header for the OAuth handshake. */
export function oauthCookie(value: string): string {
  return [
    `ajar_oauth=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/auth",
    `Max-Age=${oauthCookieTtlSeconds}`,
  ].join("; ");
}

/** Builds a cookie that removes the handshake value. */
export function clearOauthCookie(): string {
  return [
    "ajar_oauth=",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/auth",
    "Max-Age=0",
  ].join("; ");
}

/** Reads an identity from verified ID-token claims. An unverified email cannot be used to link. */
export function identityFromClaims(
  provider: OAuthProvider,
  claims: Record<string, unknown>,
): ProviderIdentity {
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : null;
  return {
    subject: typeof claims.sub === "string" ? claims.sub : "",
    email: email && email.includes("@") ? email : null,
    emailVerified: emailIsVerified(provider, claims),
    name: typeof claims.name === "string" ? claims.name.trim().slice(0, 80) : null,
  };
}

/** Checks the RS256 signature and the audience, issuer, and expiry. */
export function readIdToken(
  token: string,
  keys: JsonWebKey[],
  expected: { audience: string; issuer: (issuer: string) => boolean },
  nowSeconds = Math.floor(Date.now() / 1000),
): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad token");
  const [headerPart, bodyPart, signaturePart] = parts;
  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8")) as {
    alg?: unknown;
    kid?: unknown;
  };
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("bad token");
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("bad token");
  const signed = Buffer.from(`${headerPart}.${bodyPart}`);
  const signature = Buffer.from(signaturePart, "base64url");
  const key = createPublicKey({ key: jwk, format: "jwk" });
  if (!verify("sha256", signed, key, signature)) throw new Error("bad token");

  const claims = JSON.parse(Buffer.from(bodyPart, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
  const audience = claims.aud;
  const audienceMatches = Array.isArray(audience)
    ? audience.includes(expected.audience)
    : audience === expected.audience;
  if (
    !audienceMatches ||
    typeof claims.iss !== "string" ||
    !expected.issuer(claims.iss) ||
    typeof claims.exp !== "number" ||
    claims.exp <= nowSeconds
  ) {
    throw new Error("bad token");
  }
  return claims;
}

/** Returns true when the provider says this email belongs to the signed-in account. */
function emailIsVerified(provider: OAuthProvider, claims: Record<string, unknown>): boolean {
  if (claims.email_verified === true || claims.email_verified === "true") return true;
  if (provider === "microsoft") {
    return claims.xms_edov === true || claims.xms_edov === 1 || claims.xms_edov === "1";
  }
  return false;
}
