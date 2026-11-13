import assert from "node:assert/strict";
import test from "node:test";
import { buildMagicLinkMessage } from "./magic-link-message";

test("the sign-in email states the limit and does not ask the reader to hurry", () => {
  const message = buildMagicLinkMessage("http://localhost:3000/", "token+with/special");
  assert.equal(message.subject, "Sign in to Ajar");
  assert.match(message.url ?? "", /\/login#token=token%2Bwith%2Fspecial$/);
  assert.match(message.text, /works once and expires in 15 minutes/);
  assert.match(message.text, /ignore this email/);
  assert.match(message.text, /Do not forward/);
  assert.match(message.html, /Let's make sure it's you/);
  assert.match(message.html, /Verify my email/);
  assert.match(message.html, /cid:ajar-verify/);
  assert.equal(message.html.includes(message.url ?? "missing"), true);
  assert.equal(/act now|don't miss|urgent/i.test(message.text), false);
});
