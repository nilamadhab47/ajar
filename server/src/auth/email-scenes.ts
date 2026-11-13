import { renderEmail, type RenderedEmail } from "./email-layout";

/** The welcome note. Ready for the moment someone first has an office to open. */
export function buildWelcomeMessage(origin: string, name?: string): RenderedEmail {
  const url = `${origin.replace(/\/$/, "")}/offices`;
  return renderEmail({
    subject: "Welcome to Ajar",
    preheader: "A quiet office for remote teams.",
    headline: "Welcome to a quieter kind of workday.",
    paragraphs: [
      name ? `${name}, this office is yours to open.` : "This office is yours to open.",
      "Ajar is a quiet office for remote teams. A place to be around your people, and to work without being walked in on.",
    ],
    action: { href: url, label: "Open your office →" },
    image: "welcome",
    points: ["Be around without pressure", "Collaborate naturally", "Keep work human"],
  });
}

/** Password reset. The caller supplies the real expiry, so the mail does not invent one. */
export function buildResetMessage(url: string, expiresIn: string): RenderedEmail {
  return renderEmail({
    subject: "Reset your Ajar password",
    preheader: `This link expires in ${expiresIn}.`,
    headline: "Let's get you back inside.",
    paragraphs: ["No worries. Use this link to choose a new password and get back to your office."],
    action: { href: url, label: "Reset my password →" },
    image: "reset",
    footnotes: [
      `This link works once and expires in ${expiresIn}.`,
      "If you did not ask to reset your password, you can ignore this email.",
    ],
  });
}

/** A desk note, for when a handoff is waiting. */
export function buildNoteMessage(url: string, fromName: string): RenderedEmail {
  return renderEmail({
    subject: "A note is waiting at your desk",
    preheader: `${fromName} left you a note.`,
    headline: "A note is waiting at your desk.",
    paragraphs: [`You have a new note from ${fromName}.`],
    action: { href: url, label: "View the note →" },
    image: "note",
  });
}
