import assert from "node:assert/strict";
import test from "node:test";
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { randomToken, tokenHash } from "../auth/tokens";
import { AccountService } from "./account.service";
import { MembershipService } from "./membership.service";

test("an invite joins the matching person, and the last owner stays", async () => {
  const config = new ConfigService({ SMTP_HOST: "127.0.0.1", SMTP_PORT: "1" });
  const database = new DatabaseService(config);
  const accounts = new AccountService(database);
  const membership = new MembershipService(database, config);
  const stamp = Date.now();
  const ownerEmail = `owner.${stamp}@example.com`;
  const adminEmail = `admin.${stamp}@example.com`;
  const guestEmail = `guest.${stamp}@example.com`;
  const memberEmail = `member.${stamp}@example.com`;
  const otherEmail = `other.${stamp}@example.com`;
  const emails = [ownerEmail, adminEmail, guestEmail, memberEmail, otherEmail];
  let organizationId = "";

  try {
    const ownerId = await person(database, ownerEmail, "Owner");
    const adminId = await person(database, adminEmail, "Admin");
    const guestId = await person(database, guestEmail, "Guest");
    const memberId = await person(database, memberEmail, "Member");
    const otherId = await person(database, otherEmail, "Other");
    const created = await accounts.createOrganization(ownerId, "Marigold Studio", "Ajar");
    organizationId = created.organization.id;
    const officeId = created.office.id;
    await database.query(
      "insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'admin'), ($1, $3, 'guest')",
      [officeId, adminId, guestId],
    );

    await expectKind(ForbiddenException, membership.createInvite(guestId, officeId, memberEmail, "member"));
    await expectKind(ForbiddenException, membership.createInvite(adminId, officeId, memberEmail, "owner"));
    const invited = await membership.createInvite(ownerId, officeId, memberEmail, "member");
    assert.equal(invited.role, "member");

    const token = randomToken();
    await database.query(
      `insert into invites (workspace_id, email, role, token_hash, expires_at, invited_by)
       values ($1, $2, 'member', $3, now() + interval '7 days', $4)`,
      [officeId, memberEmail, tokenHash(token), ownerId],
    );
    await expectKind(ForbiddenException, membership.acceptInvite(otherId, token));
    const accepted = await membership.acceptInvite(memberId, token);
    assert.deepEqual(accepted, { officeId, role: "member" });
    await expectKind(UnauthorizedException, membership.acceptInvite(memberId, token));

    const expired = randomToken();
    await database.query(
      `insert into invites (workspace_id, email, role, token_hash, expires_at, invited_by)
       values ($1, $2, 'guest', $3, now() - interval '1 minute', $4)`,
      [officeId, otherEmail, tokenHash(expired), ownerId],
    );
    await expectKind(UnauthorizedException, membership.acceptInvite(otherId, expired));

    await expectKind(ForbiddenException, membership.changeRole(adminId, officeId, guestId, "owner"));
    await expectKind(ConflictException, membership.changeRole(ownerId, officeId, ownerId, "admin"));
    await membership.changeRole(ownerId, officeId, adminId, "owner");
    await membership.changeRole(adminId, officeId, ownerId, "admin");
    await expectKind(ConflictException, membership.removeMember(adminId, officeId, adminId));
    await membership.removeMember(adminId, officeId, guestId);

    const members = await membership.listMembers(memberId, officeId);
    assert.deepEqual(
      members.map((member) => member.role).sort(),
      ["admin", "member", "owner"],
    );
    const audit = await database.query<{ action: string }>(
      "select action from audit_log where workspace_id = $1 order by at",
      [officeId],
    );
    const actions = audit.rows.map((row) => row.action);
    assert.equal(actions.includes("invite.created"), true);
    assert.equal(actions.includes("invite.accepted"), true);
    assert.equal(actions.includes("member.role_changed"), true);
    assert.equal(actions.includes("member.removed"), true);
    assert.equal(actions.some((action) => action.includes("knock")), false);
  } finally {
    if (organizationId) {
      await database.query("delete from audit_log where workspace_id in (select id from workspaces where organization_id = $1)", [
        organizationId,
      ]);
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

/** Asserts a call fails with one HTTP exception. */
async function expectKind(kind: new (...args: never[]) => Error, run: Promise<unknown>): Promise<void> {
  try {
    await run;
  } catch (error) {
    assert.equal(error instanceof kind, true);
    return;
  }
  assert.fail(`expected ${kind.name}`);
}
