import { renderEmail, type RenderedEmail } from "./email-layout";

export type MagicLinkMessage = RenderedEmail;

/** Builds the sign-in email. The link is the secret, so the copy says not to forward it. */
export function buildMagicLinkMessage(origin: string, token: string): MagicLinkMessage {
  const url = `${origin.replace(/\/$/, "")}/login#token=${encodeURIComponent(token)}`;
  return renderEmail({
    subject: "Sign in to Ajar",
    preheader: "This link signs you in once and expires in 15 minutes.",
    headline: "Let's make sure it's you.",
    paragraphs: ["Use this link to sign in. It works once and expires in 15 minutes."],
    action: { href: url, label: "Verify my email →" },
    image: "verify",
    footnotes: [
      "If the button does not work, copy the address from this email into your browser.",
      "If you did not ask to sign in, you can ignore this email. Someone may have typed your address by mistake.",
      "Do not forward this email. The link signs the recipient in.",
    ],
  });
}
