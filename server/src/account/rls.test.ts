import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { AccountService } from "./account.service";
import { MembershipService } from "./membership.service";

test("a guest cannot read invites, and a member cannot read another office", async () => {
  const config = new ConfigService({ SMTP_HOST: "127.0.0.1", SMTP_PORT: "1" });
  const database = new DatabaseService(config);
  const accounts = new AccountService(database);
  const membership = new MembershipService(database, config);
  const stamp = Date.now();
  const ownerEmail = `rls-owner.${stamp}@example.com`;
  const guestEmail = `rls-guest.${stamp}@example.com`;
  const otherEmail = `rls-other.${stamp}@example.com`;
  const invitedEmail = `rls-invited.${stamp}@example.com`;
  const emails = [ownerEmail, guestEmail, otherEmail, invitedEmail];
  const organizationIds: string[] = [];

  try {
    const ownerId = await person(database, ownerEmail, "Owner");
    const guestId = await person(database, guestEmail, "Guest");
    const otherId = await person(database, otherEmail, "Other");
    const home = await accounts.createOrganization(ownerId, "Marigold Studio", "Home");
    const away = await accounts.createOrganization(otherId, "Other Studio", "Away");
    organizationIds.push(home.organization.id, away.organization.id);
    await database.query(
      "insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'guest')",
      [home.office.id, guestId],
    );
    await membership.createInvite(ownerId, home.office.id, invitedEmail, "member");

    await expectForbidden(membership.listInvites(guestId, home.office.id));
    const hidden = await database.asOffice(guestId, home.office.id, (query) =>
      query<{ count: string }>(
        "select count(*)::text as count from invites where email <> $1",
        [guestEmail],
      ),
    );
    assert.equal(hidden.rows[0]?.count, "0");

    const visible = await membership.listInvites(ownerId, home.office.id);
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.email, invitedEmail);

    const otherOffice = await database.asOffice(ownerId, home.office.id, (query) =>
      query("select id from workspaces where id = $1", [away.office.id]),
    );
    assert.equal(otherOffice.rowCount, 0);
    const ownOffice = await database.asOffice(ownerId, home.office.id, (query) =>
      query("select id from workspaces where id = $1", [home.office.id]),
    );
    assert.equal(ownOffice.rowCount, 1);
  } finally {
    for (const organizationId of organizationIds) {
      await database.query(
        "delete from audit_log where workspace_id in (select id from workspaces where organization_id = $1)",
        [organizationId],
      );
      await database.query("delete from organizations where id = $1", [organizationId]);
    }
    await database.query("delete from users where email = any($1::text[])", [emails]);
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

/** Asserts the member route rejects a guest. */
async function expectForbidden(run: Promise<unknown>): Promise<void> {
  try {
    await run;
  } catch (error) {
    assert.equal(error instanceof ForbiddenException, true);
    return;
  }
  assert.fail("expected the guest to be rejected");
}
