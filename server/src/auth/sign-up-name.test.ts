import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { AuthService } from "./auth.service";
import { randomToken, tokenHash } from "./tokens";

test("a confirmed sign-up keeps the name from the form", async () => {
  const config = new ConfigService({
    JWT_SECRET: "local-dev-secret-that-is-at-least-32-characters",
  });
  const database = new DatabaseService(config);
  const auth = new AuthService(database, config);
  const email = `signup.${Date.now()}@example.com`;
  const token = randomToken();

  try {
    await database.query(
      `insert into magic_links (email, token_hash, expires_at, display_name)
       values ($1, $2, now() + interval '15 minutes', $3)`,
      [email, tokenHash(token), "Nil Sen"],
    );
    await auth.consumeMagicLink(token, "test");

    const person = await database.query<{ display_name: string }>(
      "select display_name from users where email = $1",
      [email],
    );
    assert.equal(person.rows[0]?.display_name, "Nil Sen");
  } finally {
    await database.query("delete from magic_links where email = $1", [email]);
    await database.query("delete from users where email = $1", [email]);
    await database.onModuleDestroy();
  }
});

test("password sign-up stores the name on the confirmation link", async () => {
  const config = new ConfigService({
    JWT_SECRET: "local-dev-secret-that-is-at-least-32-characters",
  });
  const database = new DatabaseService(config);
  const auth = new AuthService(database, config);
  const email = `signup-link.${Date.now()}@example.com`;

  try {
    await auth.requestPasswordSignUp(email, "a-long-password", `client-${email}`, "Prayag");
    const link = await database.query<{ display_name: string | null }>(
      "select display_name from magic_links where email = $1",
      [email],
    );
    assert.equal(link.rows[0]?.display_name, "Prayag");
    const person = await database.query<{ id: string }>(
      "select id from users where email = $1",
      [email],
    );
    assert.equal(person.rows.length, 0);
  } finally {
    await database.query("delete from magic_links where email = $1", [email]);
    await database.query("delete from users where email = $1", [email]);
    await database.onModuleDestroy();
  }
});
