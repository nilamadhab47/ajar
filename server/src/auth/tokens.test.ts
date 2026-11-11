import assert from "node:assert/strict";
import test from "node:test";
import { RequestRateLimit } from "./rate-limit";
import { readAccessToken, signAccessToken, tokenHash } from "./tokens";

const secret = "test-secret-that-is-at-least-32-chars";

test("access token carries the user and session and rejects a bad signature", () => {
  const token = signAccessToken({ sub: "user-1", sid: "session-1" }, secret, 1_700_000_000);
  assert.deepEqual(readAccessToken(token, secret, 1_700_000_100), {
    sub: "user-1",
    sid: "session-1",
  });
  assert.throws(() => readAccessToken(`${token}x`, secret, 1_700_000_100));
  assert.throws(() => readAccessToken(token, secret, 1_700_000_000 + 16 * 60));
});

test("token hashes do not keep the original token", () => {
  const hash = tokenHash("plain-token");
  assert.equal(hash.length, 64);
  assert.equal(hash.includes("plain-token"), false);
});

test("magic-link requests stop after five in a window", () => {
  const limits = new RequestRateLimit();
  const now = 1_000;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(limits.allow("ip:1", now), true);
  }
  assert.equal(limits.allow("ip:1", now), false);
  assert.equal(limits.allow("ip:1", now + 15 * 60 * 1000), true);
});
