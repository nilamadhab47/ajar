import { renderEmail, type RenderedEmail } from "./email-layout";

/** Confirmation mail for a new password. The password is never included. */
export function buildPasswordConfirmMessage(origin: string, token: string): RenderedEmail {
  const url = `${origin.replace(/\/$/, "")}/login#token=${encodeURIComponent(token)}`;
  return renderEmail({
    subject: "Confirm your Ajar account",
    preheader: "This link confirms your account once and expires in 15 minutes.",
    headline: "Let's make sure it's you.",
    paragraphs: ["Use this link to finish creating your account. It works once and expires in 15 minutes."],
    action: { href: url, label: "Verify my email →" },
    image: "verify",
    footnotes: [
      "If you did not ask for an account, you can ignore this email.",
      "Do not forward this email. The link confirms the recipient's account.",
    ],
  });
}

/** Mail for an address that already has an account. It contains no sign-in link. */
export function buildAccountExistsMessage(origin?: string): Pick<RenderedEmail, "subject" | "text" | "html" | "image"> {
  const login = origin ? `${origin.replace(/\/$/, "")}/login` : undefined;
  const message = renderEmail({
    subject: "You already have an Ajar account",
    preheader: "This message does not change your password.",
    headline: "You already have an account.",
    paragraphs: [
      "Sign in with your password, or request a sign-in link. This message does not change your password.",
    ],
    action: login ? { href: login, label: "Sign in →" } : undefined,
    image: "verify",
    footnotes: ["If you did not try to create an account, you can ignore this email."],
  });
  return { subject: message.subject, text: message.text, html: message.html, image: message.image };
}
