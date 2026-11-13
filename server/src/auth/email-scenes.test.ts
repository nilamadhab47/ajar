import assert from "node:assert/strict";
import test from "node:test";
import { readEmailImage } from "./email-layout";
import { buildNoteMessage, buildResetMessage, buildWelcomeMessage } from "./email-scenes";

test("the welcome, reset, and note layouts keep their pictures and links", () => {
  const welcome = buildWelcomeMessage("http://localhost:3000/", "Nil");
  const reset = buildResetMessage("http://localhost:3000/reset#token=abc", "1 hour");
  const note = buildNoteMessage("http://localhost:3000/desk", "Priya");

  assert.match(welcome.html, /Welcome to a quieter kind of workday/);
  assert.match(welcome.html, /Open your office/);
  assert.match(welcome.html, /cid:ajar-welcome/);
  assert.match(welcome.text, /Nil, this office is yours to open/);
  assert.match(welcome.url ?? "", /\/offices$/);

  assert.match(reset.html, /Let's get you back inside/);
  assert.match(reset.text, /expires in 1 hour/);
  assert.match(reset.html, /cid:ajar-reset/);
  assert.equal(reset.html.includes("<script"), false);

  assert.match(note.html, /A note is waiting at your desk/);
  assert.match(note.text, /Priya/);
  assert.match(note.html, /cid:ajar-note/);
  assert.equal(/act now|don't miss|urgent/i.test(note.text + reset.text + welcome.text), false);

  const image = readEmailImage("verify");
  assert.equal(image.cid, "ajar-verify");
  assert.ok(image.content.length > 500);
});
