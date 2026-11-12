import { buildMagicLinkMessage, type MagicLinkMessage } from "./magic-link-message";

/** Confirmation mail for a new password. The password is never included. */
export function buildPasswordConfirmMessage(origin: string, token: string): MagicLinkMessage {
  const link = buildMagicLinkMessage(origin, token);
  const text = [
    "Confirm your Ajar account",
    "",
    "Use this link to finish creating your account. It works once and expires in 15 minutes.",
    "",
    link.url,
    "",
    "If you did not ask for an account, you can ignore this email.",
    "",
    "Ajar, a quiet office for remote teams.",
  ].join("\n");
  const html = link.html
    .replace("Sign in to Ajar", "Confirm your Ajar account")
    .replace(">Sign in</h1>", ">Confirm your account</h1>")
    .replace(">Sign in</a>", ">Confirm account</a>")
    .replace(
      "Use the button below to sign in. The link works once and expires in 15 minutes.",
      "Use the button below to finish creating your account. The link works once and expires in 15 minutes.",
    )
    .replace(
      "This link signs you in once and expires in 15 minutes.",
      "This link confirms your account once and expires in 15 minutes.",
    )
    .replace(
      "If you did not ask to sign in, you can ignore this email. Someone may have typed your address by mistake.",
      "If you did not ask for an account, you can ignore this email.",
    )
    .replace(
      "Do not forward this email. The link signs the recipient in.",
      "Do not forward this email. The link confirms the recipient's account.",
    );
  return { subject: "Confirm your Ajar account", text, html, url: link.url };
}

/** Mail for an address that already has an account. It contains no sign-in link. */
export function buildAccountExistsMessage(): Pick<MagicLinkMessage, "subject" | "text" | "html"> {
  const subject = "You already have an Ajar account";
  const text = [
    "You already have an Ajar account",
    "",
    "Sign in with your password, or request a sign-in link. This message does not change your password.",
    "",
    "If you did not try to create an account, you can ignore this email.",
    "",
    "Ajar, a quiet office for remote teams.",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:#f6f4f2;color:#282a30;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">This message does not change your password.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e0d9;border-radius:12px;">
        <tr><td style="padding:32px;font-size:15px;line-height:1.5;">
          <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#777b83;">Ajar</p>
          <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:600;">You already have an account</h1>
          <p style="margin:0 0 12px;">Sign in with your password, or request a sign-in link. This message does not change your password.</p>
          <p style="margin:0;color:#777b83;font-size:13px;">If you did not try to create an account, you can ignore this email.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#777b83;">Ajar, a quiet office for remote teams.</p>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, text, html };
}
