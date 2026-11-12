import assert from "node:assert/strict";
import test from "node:test";
import { buildAccountExistsMessage, buildPasswordConfirmMessage } from "./password-message";
import { hashPassword, verifyPassword } from "./passwords";

test("a password hash verifies only the same password", async () => {
  const stored = await hashPassword("correct horse battery");
  assert.equal(stored.includes("correct horse"), false);
  assert.equal(await verifyPassword("correct horse battery", stored), true);
  assert.equal(await verifyPassword("wrong horse battery", stored), false);
  assert.equal(await verifyPassword("correct horse battery", `${stored}x`), false);
});

test("password mail never contains the password", () => {
  const confirm = buildPasswordConfirmMessage("http://localhost:3000", "token-value");
  const existing = buildAccountExistsMessage();
  assert.match(confirm.text, /works once and expires in 15 minutes/);
  assert.match(confirm.url, /#token=token-value$/);
  assert.equal(confirm.text.includes("correct horse"), false);
  assert.equal(existing.text.includes("http"), false);
  assert.match(existing.text, /does not change your password/);
});
