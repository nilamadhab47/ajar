import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Illustrations cropped from the Ajar email templates. */
export const emailImages = ["welcome", "verify", "invite", "reset", "note"] as const;
export type EmailImage = (typeof emailImages)[number];

const imageSize: Record<EmailImage, { width: number; height: number; alt: string }> = {
  welcome: { width: 274, height: 104, alt: "An open office door and a welcome sign" },
  verify: { width: 272, height: 104, alt: "A desk with a lock on the screen" },
  invite: { width: 276, height: 104, alt: "Two people talking in an office" },
  reset: { width: 294, height: 70, alt: "A laptop with a lock, beside a lamp" },
  note: { width: 302, height: 96, alt: "A sealed note on a desk" },
};

export type EmailAction = { href: string; label: string };

export type EmailContent = {
  subject: string;
  preheader: string;
  headline: string;
  paragraphs: string[];
  action?: EmailAction;
  image: EmailImage;
  /** Quiet lines under the button. These are not a second call to action. */
  footnotes?: string[];
  office?: { name: string; detail: string };
  points?: string[];
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
  url?: string;
  image: EmailImage;
};

const page = "#F8EFEA";
const card = "#FFFCF8";
const ink = "#3C2A78";
const body = "#3A3550";
const muted = "#7A7484";
const button = "#6C63C7";
const font = "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif";
const sans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Renders one transactional message. The plain-text part carries the same link. */
export function renderEmail(content: EmailContent): RenderedEmail {
  const text = [
    content.headline,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(content.office ? [`${content.office.name}`, content.office.detail, ""] : []),
    ...(content.points ?? []).map((point) => `· ${point}`),
    ...(content.points ? [""] : []),
    ...(content.action ? [content.action.label, content.action.href, ""] : []),
    ...(content.footnotes ?? []).flatMap((line) => [line, ""]),
    "Be around, on your terms.",
    "Ajar, a quiet office for remote teams.",
  ].join("\n");

  return {
    subject: content.subject,
    text,
    html: htmlFor(content),
    url: content.action?.href,
    image: content.image,
  };
}

/** Reads one illustration for an inline cid attachment. */
export function readEmailImage(image: EmailImage): { filename: string; cid: string; content: Buffer } {
  const filename = `${image}.jpg`;
  return {
    filename,
    cid: `ajar-${image}`,
    content: readFileSync(join(__dirname, "../../assets/email", filename)),
  };
}

/** Escapes text placed into HTML attributes and body copy. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlFor(content: EmailContent): string {
  const picture = imageSize[content.image];
  const cid = `ajar-${content.image}`;
  const office = content.office
    ? `<tr><td style="padding:4px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1EA;border:1px solid #E7DDD4;border-radius:12px;">
          <tr><td style="padding:12px 14px;font-family:${sans};">
            <p style="margin:0;font-size:14px;font-weight:700;color:${ink};">${escapeHtml(content.office.name)}</p>
            <p style="margin:4px 0 0;font-size:12px;line-height:1.4;color:${muted};">${escapeHtml(content.office.detail)}</p>
          </td></tr>
        </table>
      </td></tr>`
    : "";
  const points = content.points
    ? `<tr><td style="padding:8px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${content.points
            .map(
              (point) =>
                `<td align="center" valign="top" style="width:33%;padding:0 6px;font-family:${sans};font-size:11px;line-height:1.35;color:${muted};">${escapeHtml(point)}</td>`,
            )
            .join("")}
        </tr></table>
      </td></tr>`
    : "";
  const action = content.action ? buttonRow(content.action) : "";
  const footnotes = (content.footnotes ?? [])
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-family:${sans};font-size:13px;line-height:1.5;color:${muted};">${escapeHtml(line)}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${page};color:${body};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${page};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${card};border:1px solid #E7DDD4;border-radius:18px;">
          <tr>
            <td align="center" style="padding:22px 32px 8px;font-family:${font};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${ink};">ajar</td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 0;">
              <img src="cid:${cid}" width="456" alt="${escapeHtml(picture.alt)}" style="display:block;width:100%;max-width:456px;height:auto;border:0;border-radius:12px;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 36px 0;font-family:${font};font-size:28px;line-height:1.2;font-weight:700;color:${ink};">${escapeHtml(content.headline)}</td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 40px 0;font-family:${sans};font-size:15px;line-height:1.5;color:${body};">
              ${content.paragraphs.map((paragraph) => `<p style="margin:0 0 8px;">${escapeHtml(paragraph)}</p>`).join("")}
            </td>
          </tr>
          ${office}
          ${action}
          ${points}
          <tr>
            <td align="center" style="padding:8px 36px 22px;">${footnotes}</td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-family:${sans};font-size:13px;line-height:1.4;color:${muted};">Be around, on your terms.</p>
        <p style="margin:4px 0 0;font-family:${sans};font-size:12px;line-height:1.4;color:${muted};">Ajar, a quiet office for remote teams.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** A real button in Outlook and everywhere else. The link text is also in the plain part. */
function buttonRow(action: EmailAction): string {
  const href = escapeHtml(action.href);
  const label = escapeHtml(action.label);
  return `<tr><td align="center" style="padding:18px 32px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="${button}" style="border-radius:999px;background:${button};">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:230px;" arcsize="50%" stroke="f" fillcolor="${button}">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${sans};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
        <!--<![endif]-->
      </td>
    </tr></table>
  </td></tr>`;
}
