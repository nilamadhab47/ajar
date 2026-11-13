import assert from "node:assert/strict";
import test from "node:test";
import { buildInviteMessage } from "./invite-message";

test("an invitation says who invited whom and does not ask the reader to hurry", () => {
  const message = buildInviteMessage(
    "http://localhost:3000",
    "token-value",
    "Ajar <Studio>",
    "Priya",
    "member",
  );
  assert.match(message.subject, /Join Ajar <Studio> on Ajar/);
  assert.match(message.text, /Priya invited you to join Ajar <Studio> as a member/);
  assert.match(message.text, /Someone left the door open for you/);
  assert.match(message.text, /works once and expires in 7 days/);
  assert.match(message.html, /Join the office/);
  assert.match(message.url ?? "", /\/invite#token=token-value$/);
  assert.match(message.html, /Ajar &lt;Studio&gt;/);
  assert.equal(message.html.includes("<Studio>"), false);
  assert.equal(/act now|hurry|urgent/i.test(message.text), false);
});
