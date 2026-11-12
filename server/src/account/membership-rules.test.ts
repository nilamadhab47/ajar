import assert from "node:assert/strict";
import test from "node:test";
import { canChangeRole, canInvite, canRemove } from "./membership-rules";

test("a guest cannot invite, and only an owner can invite an owner", () => {
  assert.equal(canInvite("guest", "member"), false);
  assert.equal(canInvite("member", "guest"), false);
  assert.equal(canInvite("admin", "owner"), false);
  assert.equal(canInvite("admin", "member"), true);
  assert.equal(canInvite("owner", "owner"), true);
});

test("role changes that touch owner are owner-only, and the last owner cannot leave", () => {
  assert.equal(canChangeRole("admin", "member", "admin"), true);
  assert.equal(canChangeRole("admin", "member", "owner"), false);
  assert.equal(canChangeRole("admin", "owner", "admin"), false);
  assert.equal(canChangeRole("member", "guest", "member"), false);
  assert.equal(canRemove("guest", "member", false), false);
  assert.equal(canRemove("admin", "owner", false), false);
  assert.equal(canRemove("guest", "guest", true), true);
});
