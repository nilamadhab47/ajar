import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { AuthService } from "./auth.service";
import { hashPassword, verifyPassword } from "./passwords";
import { randomToken, tokenHash } from "./tokens";

test("the first confirmed password stays when another link for that address is used", async () => {
  const config = new ConfigService({
    JWT_SECRET: "local-dev-secret-that-is-at-least-32-characters",
  });
  const database = new DatabaseService(config);
  const auth = new AuthService(database, config);
  const emails: string[] = [];

  try {
    await confirm(database, auth, emails, "first-password-ok", "second-password-ok", false);
    await confirm(database, auth, emails, "first-password-ok", "second-password-ok", true);
  } finally {
    if (emails.length > 0) {
      await database.query("delete from magic_links where email = any($1::text[])", [emails]);
      await database.query("delete from users where email = any($1::text[])", [emails]);
    }
    await database.onModuleDestroy();
  }
});

/** Inserts two confirmation links and checks that only the first one consumed sets the password. */
async function confirm(
  database: DatabaseService,
  auth: AuthService,
  emails: string[],
  firstPassword: string,
  secondPassword: string,
  reverse: boolean,
): Promise<void> {
  const email = `confirm.${Date.now()}.${emails.length}@example.com`;
  emails.push(email);
  const firstToken = randomToken();
  const secondToken = randomToken();
  await insertLink(database, email, firstToken, await hashPassword(firstPassword));
  await insertLink(database, email, secondToken, await hashPassword(secondPassword));

  const [keptPassword, replacedPassword] = reverse
    ? [secondPassword, firstPassword]
    : [firstPassword, secondPassword];
  const [firstUsed, secondUsed] = reverse
    ? [secondToken, firstToken]
    : [firstToken, secondToken];
  await auth.consumeMagicLink(firstUsed, "test");
  await auth.consumeMagicLink(secondUsed, "test");

  const person = await database.query<{ password_hash: string | null }>(
    "select password_hash from users where email = $1",
    [email],
  );
  const stored = person.rows[0]?.password_hash;
  assert.ok(stored);
  assert.equal(await verifyPassword(keptPassword, stored), true);
  assert.equal(await verifyPassword(replacedPassword, stored), false);

  const leftover = await database.query<{ count: string }>(
    "select count(*)::text as count from magic_links where email = $1 and password_hash is not null",
    [email],
  );
  assert.equal(leftover.rows[0]?.count, "0");
}

/** Stores one unused confirmation link with a known token. */
async function insertLink(
  database: DatabaseService,
  email: string,
  token: string,
  passwordHash: string,
): Promise<void> {
  await database.query(
    `insert into magic_links (email, token_hash, expires_at, password_hash)
     values ($1, $2, now() + interval '15 minutes', $3)`,
    [email, tokenHash(token), passwordHash],
  );
}
