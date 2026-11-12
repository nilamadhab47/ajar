import assert from "node:assert/strict";
import test from "node:test";
import { avatarPatch, officeName, presenceStatus } from "./account-input";

test("a company name is trimmed and cannot be empty", () => {
  assert.equal(officeName("  Marigold Studio  "), "Marigold Studio");
  assert.equal(officeName("   "), null);
  assert.equal(officeName(12), null);
});

test("profile patches accept the office statuses and an avatar object", () => {
  assert.equal(presenceStatus("focus"), "focus");
  assert.equal(presenceStatus("asleep"), null);
  assert.deepEqual(avatarPatch({ id: "a" }), { id: "a" });
  assert.equal(avatarPatch(["nope"]), null);
});
