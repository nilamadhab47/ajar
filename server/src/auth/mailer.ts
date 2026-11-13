import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { readEmailImage, type EmailImage } from "./email-layout";
import { buildMagicLinkMessage } from "./magic-link-message";

const logger = new Logger("MagicLinkMail");
const verifiedFrom = "Ajar <hello@meetajar.com>";

type OutboundMail = { subject: string; text: string; html: string; image?: EmailImage };

/** Sends one message through Resend when a key is set, and through Mailpit otherwise. */
export async function sendPreparedMessage(
  config: ConfigService,
  email: string,
  message: OutboundMail,
): Promise<void> {
  const apiKey = config.get<string>("RESEND_API_KEY");
  const from = fromAddress(config.get<string>("MAIL_FROM"), Boolean(apiKey));

  if (apiKey) {
    await sendWithResend(apiKey, from, email, message);
    logger.log("Mail accepted by Resend");
    return;
  }

  const host = config.get<string>("SMTP_HOST") ?? "127.0.0.1";
  const port = Number(config.get<string>("SMTP_PORT") ?? 1025);
  const transport = nodemailer.createTransport({ host, port, secure: false });
  const image = message.image ? readEmailImage(message.image) : undefined;
  await transport.sendMail({
    from,
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: image
      ? [{ filename: image.filename, content: image.content, cid: image.cid }]
      : undefined,
  });
  logger.log("Mail accepted by the local mail catcher");
}

/** Sends the magic-link sign-in email. The token is not logged. */
export async function sendMagicLink(
  config: ConfigService,
  email: string,
  token: string,
): Promise<void> {
  const origin = config.get<string>("APP_ORIGIN") ?? "http://localhost:3000";
  await sendPreparedMessage(config, email, buildMagicLinkMessage(origin, token));
}

/** Delivers one transactional message. The error text does not include the message body. */
async function sendWithResend(
  apiKey: string,
  from: string,
  email: string,
  message: OutboundMail,
): Promise<void> {
  const image = message.image ? readEmailImage(message.image) : undefined;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: image
        ? [{ filename: image.filename, content: image.content.toString("base64"), content_id: image.cid }]
        : undefined,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status})`);
  }
}

/** Uses the verified meetajar.com address once Resend is configured. */
function fromAddress(configured: string | undefined, resend: boolean): string {
  if (!configured || configured.includes("ajar@localhost")) {
    return resend ? verifiedFrom : configured || "Ajar <ajar@localhost>";
  }
  return configured;
}
