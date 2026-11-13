import assert from "node:assert/strict";
import test from "node:test";
import { deskChoice, nearestFreeDesk, STARTER_DESKS } from "./desks";

test("skipping the desk takes the one nearest the front door", () => {
  assert.equal(nearestFreeDesk(new Set()), "W-12");
  assert.equal(nearestFreeDesk(new Set(["W-12"])), "W-11");
  assert.equal(nearestFreeDesk(new Set(STARTER_DESKS.map((desk) => desk.id))), null);
  assert.equal(deskChoice("", new Set()), "W-12");
  assert.equal(deskChoice("W-01", new Set()), "W-01");
  assert.equal(deskChoice("W-01", new Set(["W-01"])), null);
  assert.equal(deskChoice("sofa", new Set()), null);
});
