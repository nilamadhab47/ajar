export type MagicLinkMessage = {
  subject: string;
  text: string;
  html: string;
  url: string;
};

/** Builds the sign-in email. The link is the secret, so the copy says not to forward it. */
export function buildMagicLinkMessage(origin: string, token: string): MagicLinkMessage {
  const url = `${origin.replace(/\/$/, "")}/login#token=${encodeURIComponent(token)}`;
  const subject = "Sign in to Ajar";
  const text = [
    "Sign in to Ajar",
    "",
    "Use this link to sign in. It works once and expires in 15 minutes.",
    "",
    url,
    "",
    "If you did not ask to sign in, you can ignore this email. Someone may have typed your address by mistake.",
    "",
    "Do not forward this email. The link signs the recipient in.",
    "",
    "Ajar, a quiet office for remote teams.",
  ].join("\n");

  const safeUrl = escapeHtml(url);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4f2;color:#282a30;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    This link signs you in once and expires in 15 minutes.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e0d9;border-radius:12px;">
          <tr>
            <td style="padding:32px 32px 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#777b83;">Ajar</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:600;color:#282a30;">Sign in</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#282a30;">
              <p style="margin:0;">Use the button below to sign in. The link works once and expires in 15 minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <a href="${safeUrl}" style="display:inline-block;background:#574eb3;color:#ffffff;text-decoration:none;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;padding:12px 18px;border-radius:8px;">Sign in</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#777b83;">
              <p style="margin:0 0 8px;">If the button does not work, copy this address into your browser:</p>
              <p style="margin:0;word-break:break-all;"><a href="${safeUrl}" style="color:#574eb3;">${safeUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#777b83;">
              <p style="margin:0 0 8px;">If you did not ask to sign in, you can ignore this email. Someone may have typed your address by mistake.</p>
              <p style="margin:0;">Do not forward this email. The link signs the recipient in.</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.4;color:#777b83;">Ajar, a quiet office for remote teams.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html, url };
}

/** Escapes text placed into HTML attributes and body copy. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
