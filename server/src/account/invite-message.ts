import { renderEmail, type RenderedEmail } from "../auth/email-layout";

const inviteTtl = "7 days";

/** How long an invitation stays usable. */
export const inviteLifetime = inviteTtl;

/** Builds the invitation email. The link is the secret, so the copy says not to forward it. */
export function buildInviteMessage(
  origin: string,
  token: string,
  officeName: string,
  inviterName: string,
  role: string,
): RenderedEmail {
  const url = `${origin.replace(/\/$/, "")}/invite#token=${encodeURIComponent(token)}`;
  const place = role === "owner" || role === "admin" ? `an ${role}` : `a ${role}`;
  return renderEmail({
    subject: `Join ${officeName} on Ajar`,
    preheader: `${inviterName} invited you to ${officeName}.`,
    headline: "Someone left the door open for you.",
    paragraphs: [`${inviterName} invited you to join ${officeName} as ${place}.`],
    office: { name: officeName, detail: `Invited as ${place}. The link works once and expires in ${inviteTtl}.` },
    action: { href: url, label: "Join the office →" },
    image: "invite",
    footnotes: [
      "If you did not expect this invitation, you can ignore this email.",
      "Do not forward this email. The link accepts the invitation for whoever opens it.",
    ],
  });
}
