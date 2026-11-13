import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { AccountService } from "./account.service";
import { placeTarget } from "./places";
import { PlacesService } from "./places.service";

test("an unknown place is rejected before it is stored", () => {
  assert.equal(placeTarget("area", "product")?.id, "product");
  assert.equal(placeTarget("room", "studio")?.id, "studio");
  assert.equal(placeTarget("desk", "W-12")?.id, "W-12");
  assert.equal(placeTarget("area", "sofa"), null);
  assert.equal(placeTarget("desk", "seat-w01"), null);
});

test("the owner can rename an area and leave a line on a room and a desk", async () => {
  const database = new DatabaseService(new ConfigService({}));
  const accounts = new AccountService(database);
  const places = new PlacesService(database);
  const stamp = Date.now();
  const ownerEmail = `places-owner.${stamp}@example.com`;
  const memberEmail = `places-member.${stamp}@example.com`;
  const otherEmail = `places-other.${stamp}@example.com`;
  let organizationId = "";

  try {
    const ownerId = await person(database, ownerEmail, "Owner");
    const memberId = await person(database, memberEmail, "Member");
    const otherId = await person(database, otherEmail, "Other");
    const created = await accounts.createOrganization(ownerId, "Cruit", "Ajar", {
      title: "Founder",
      department: "Product",
      deskId: "W-01",
    });
    organizationId = created.organization.id;
    const officeId = created.office.id;
    await database.query(
      "insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'member')",
      [officeId, memberId],
    );

    const area = await places.savePlace(ownerId, officeId, "area", "product", "Growth", "Where the plan lives");
    assert.equal(area.name, "Growth");
    const room = await places.savePlace(ownerId, officeId, "room", "studio", null, "The dev lounge stays quiet");
    assert.equal(room.note, "The dev lounge stays quiet");
    const desk = await places.savePlace(ownerId, officeId, "desk", "W-01", null, "Founder desk");
    assert.equal(desk.note, "Founder desk");

    const visible = await places.listPlaces(memberId, officeId);
    assert.equal(visible.find((place) => place.id === "product")?.name, "Growth");
    assert.equal(visible.find((place) => place.id === "studio")?.note, "The dev lounge stays quiet");
    assert.equal(visible.find((place) => place.id === "W-01")?.note, "Founder desk");

    await expectKind(ForbiddenException, places.savePlace(memberId, officeId, "area", "design", "Art", null));
    await expectKind(NotFoundException, places.listPlaces(otherId, officeId));

    const cleared = await places.savePlace(ownerId, officeId, "desk", "W-01", null, null);
    assert.equal(cleared.note, null);
    const after = await places.listPlaces(ownerId, officeId);
    assert.equal(after.some((place) => place.id === "W-01"), false);
  } finally {
    if (organizationId) await database.query("delete from organizations where id = $1", [organizationId]);
    await database.query("delete from users where email = any($1::text[])", [[ownerEmail, memberEmail, otherEmail]]);
    await database.onModuleDestroy();
  }
});

async function person(database: DatabaseService, email: string, name: string): Promise<string> {
  const inserted = await database.query<{ id: string }>(
    "insert into users (email, display_name) values ($1, $2) returning id",
    [email, name],
  );
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error("person was not created");
  return id;
}

async function expectKind(kind: new (...args: never[]) => Error, run: Promise<unknown>): Promise<void> {
  try {
    await run;
  } catch (error) {
    assert.equal(error instanceof kind, true);
    return;
  }
  assert.fail("expected an error");
}
