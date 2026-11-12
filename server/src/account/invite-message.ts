const inviteTtl = "7 days";

/** How long an invitation stays usable. */
export const inviteLifetime = inviteTtl;

type InviteMessage = { subject: string; text: string; html: string; url: string };

/** Builds the invitation email. The link is the secret, so the copy says not to forward it. */
export function buildInviteMessage(
  origin: string,
  token: string,
  officeName: string,
  inviterName: string,
  role: string,
): InviteMessage {
  const url = `${origin.replace(/\/$/, "")}/invite#token=${encodeURIComponent(token)}`;
  const subject = `Join ${officeName} on Ajar`;
  const place = role === "owner" || role === "admin" ? `an ${role}` : `a ${role}`;
  const text = [
    subject,
    "",
    `${inviterName} invited you to ${officeName} as ${place}.`,
    "",
    "The link works once and expires in 7 days.",
    "",
    url,
    "",
    "If you did not expect this invitation, you can ignore this email.",
    "",
    "Do not forward this email. The link accepts the invitation for whoever opens it.",
    "",
    "Ajar, a quiet office for remote teams.",
  ].join("\n");
  const safeUrl = escapeHtml(url);
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:#f6f4f2;color:#282a30;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(inviterName)} invited you to ${escapeHtml(officeName)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e0d9;border-radius:12px;">
        <tr><td style="padding:32px;font-size:15px;line-height:1.5;">
          <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#777b83;">Ajar</p>
          <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:600;">Join ${escapeHtml(officeName)}</h1>
          <p style="margin:0 0 16px;">${escapeHtml(inviterName)} invited you as ${escapeHtml(place)}. The link works once and expires in 7 days.</p>
          <a href="${safeUrl}" style="display:inline-block;background:#574eb3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:12px 18px;border-radius:8px;">Accept invite</a>
          <p style="margin:16px 0 0;color:#777b83;font-size:13px;">If you did not expect this invitation, you can ignore this email.</p>
          <p style="margin:8px 0 0;color:#777b83;font-size:13px;">Do not forward this email. The link accepts the invitation for whoever opens it.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#777b83;">Ajar, a quiet office for remote teams.</p>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, text, html, url };
}

/** Escapes text placed into the invitation HTML. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
