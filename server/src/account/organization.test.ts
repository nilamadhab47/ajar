import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { AccountService } from "./account.service";

test("creating a company saves the owner's designation, department, and desk", async () => {
  const database = new DatabaseService(new ConfigService({}));
  const accounts = new AccountService(database);
  const email = `org.${Date.now()}@example.com`;
  const organizationIds: string[] = [];

  try {
    const person = await database.query<{ id: string }>(
      "insert into users (email, display_name) values ($1, 'Nil') returning id",
      [email],
    );
    const userId = person.rows[0]?.id;
    assert.ok(userId);
    const created = await accounts.createOrganization(userId, "Cruit", "Ajar", {
      description: "A quiet office for the product team",
      title: "Founder",
      department: "Product",
      deskId: "W-01",
    });
    organizationIds.push(created.organization.id);
    assert.equal(created.office.role, "owner");
    assert.equal(created.office.deskId, "W-01");

    const skipped = await accounts.createOrganization(userId, "Second", "Floor");
    organizationIds.push(skipped.organization.id);
    const offices = await accounts.listOffices(userId);
    const first = offices.find((office) => office.id === created.office.id);
    const second = offices.find((office) => office.id === skipped.office.id);
    assert.equal(first?.title, "Founder");
    assert.equal(first?.department, "Product");
    assert.equal(first?.description, "A quiet office for the product team");
    assert.equal(first?.deskId, "W-01");
    assert.equal(second?.deskId, "W-12");
    assert.equal(second?.title, null);

    const named = await database.query<{ title: string | null }>(
      "select title from users where id = $1",
      [userId],
    );
    assert.equal(named.rows[0]?.title, "Founder");

  } finally {
    if (organizationIds.length > 0) {
      await database.query("delete from organizations where id = any($1::uuid[])", [organizationIds]);
    }
    await database.query("delete from users where email = $1", [email]);
    await database.onModuleDestroy();
  }
});
