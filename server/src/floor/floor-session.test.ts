import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountService } from "../account/account.service";
import { DatabaseService } from "../database/database.service";
import { FloorSessionService } from "./floor-session.service";
import { FloorTickets, floorTicketTtlSeconds } from "./floor-tickets";

test("a member gets a 60-second ticket, and a stranger cannot see the floor", async () => {
  const config = new ConfigService();
  const database = new DatabaseService(config);
  const accounts = new AccountService(database);
  const tickets = new FloorTickets(config);
  const sessions = new FloorSessionService(database, tickets, config);
  const stamp = Date.now();
  const ownerEmail = `floor-owner.${stamp}@example.com`;
  const guestEmail = `floor-guest.${stamp}@example.com`;
  const otherEmail = `floor-other.${stamp}@example.com`;
  let organizationId = "";

  try {
    const ownerId = await person(database, ownerEmail, "Owner");
    const guestId = await person(database, guestEmail, "Guest");
    const otherId = await person(database, otherEmail, "Other");
    const created = await accounts.createOrganization(ownerId, "Marigold Studio", "Ajar");
    organizationId = created.organization.id;
    const floor = await database.query<{ id: string }>("select id from floors where workspace_id = $1", [
      created.office.id,
    ]);
    const floorId = floor.rows[0]?.id;
    if (!floorId) throw new Error("floor was not created");
    await database.query(
      "insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'guest')",
      [created.office.id, guestId],
    );

    await expectNotFound(sessions.open(otherId, floorId));

    const guestSession = await sessions.open(guestId, floorId);
    assert.equal(guestSession.wsUrl.includes("?"), false);
    assert.equal(guestSession.wsUrl.includes(guestSession.ticket), false);

    const dirty = new FloorSessionService(
      database,
      tickets,
      new ConfigService({ GATEWAY_WS_URL: "ws://gateway.example/office?token=access-token" }),
    );
    const opened = await dirty.open(ownerId, floorId);
    assert.equal(opened.wsUrl, "ws://gateway.example/office");
    assert.equal(opened.wsUrl.includes("access-token"), false);
    const raw = await tickets.take(opened.ticket);
    const payload = JSON.parse(raw ?? "{}") as { userId: string; floorId: string; workspaceId: string };
    assert.deepEqual(payload, { userId: ownerId, floorId, workspaceId: created.office.id });
    assert.equal(JSON.stringify(payload).includes("access-token"), false);
    const remaining = await tickets.ttl(opened.ticket);
    assert.equal(remaining, -2);
    assert.equal(await tickets.take(opened.ticket), null);
    assert.ok(floorTicketTtlSeconds === 60);

    const stored = await sessions.open(ownerId, floorId);
    const ttl = await tickets.ttl(stored.ticket);
    assert.ok(ttl > 0 && ttl <= floorTicketTtlSeconds);
    await tickets.take(stored.ticket);
    await tickets.take(guestSession.ticket);
  } finally {
    if (organizationId) {
      await database.query(
        "delete from audit_log where workspace_id in (select id from workspaces where organization_id = $1)",
        [organizationId],
      );
      await database.query("delete from organizations where id = $1", [organizationId]);
    }
    await database.query("delete from users where email = any($1::text[])", [
      [ownerEmail, guestEmail, otherEmail],
    ]);
    await tickets.onModuleDestroy();
    await database.onModuleDestroy();
  }
});

/** Inserts a person and returns their id. */
async function person(database: DatabaseService, email: string, name: string): Promise<string> {
  const row = await database.query<{ id: string }>(
    "insert into users (email, display_name) values ($1, $2) returning id",
    [email, name],
  );
  const id = row.rows[0]?.id;
  if (!id) throw new Error("person was not created");
  return id;
}

/** Asserts the floor is hidden. */
async function expectNotFound(pending: Promise<unknown>): Promise<void> {
  await assert.rejects(pending, (error: unknown) => error instanceof NotFoundException);
}
