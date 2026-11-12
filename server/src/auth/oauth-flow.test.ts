import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  createPkce,
  identityFromClaims,
  openOauthCookie,
  readIdToken,
  sealOauthCookie,
} from "./oauth-flow";

const secret = "test-secret-that-is-at-least-32-chars";

test("PKCE challenge is the SHA-256 of the verifier", () => {
  const pkce = createPkce();
  assert.equal(createHash("sha256").update(pkce.verifier).digest("base64url"), pkce.challenge);
});

test("the OAuth cookie rejects a tampered payload", () => {
  const sealed = sealOauthCookie(
    { provider: "google", state: "state", verifier: "verifier" },
    secret,
  );
  assert.deepEqual(openOauthCookie(sealed, secret), {
    provider: "google",
    state: "state",
    verifier: "verifier",
  });
  assert.equal(openOauthCookie(`${sealed}x`, secret), null);
});

test("an unverified provider email is not usable for linking", () => {
  assert.equal(
    identityFromClaims("google", { sub: "g1", email: "ada@example.com", email_verified: false })
      .emailVerified,
    false,
  );
  assert.equal(
    identityFromClaims("microsoft", { sub: "m1", email: "ada@example.com" }).emailVerified,
    false,
  );
  assert.equal(
    identityFromClaims("microsoft", { sub: "m1", email: "ada@example.com", xms_edov: "1" })
      .emailVerified,
    true,
  );
});

test("an ID token must match the audience and signature", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = publicKey.export({ format: "jwk" });
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: "user",
      aud: "client",
      iss: "https://accounts.google.com",
      exp: 1_900_000_000,
      email: "ada@example.com",
      email_verified: true,
    }),
  ).toString("base64url");
  const signature = sign("sha256", Buffer.from(`${header}.${body}`), privateKey).toString("base64url");
  const token = `${header}.${body}.${signature}`;
  const claims = readIdToken(token, [jwk], {
    audience: "client",
    issuer: (issuer) => issuer === "https://accounts.google.com",
  }, 1_800_000_000);
  assert.equal(claims.sub, "user");
  assert.throws(() =>
    readIdToken(token, [jwk], {
      audience: "other",
      issuer: (issuer) => issuer === "https://accounts.google.com",
    }, 1_800_000_000),
  );
});
