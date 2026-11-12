import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { buildMagicLinkMessage } from "./magic-link-message";

const logger = new Logger("MagicLinkMail");

type OutboundMail = { subject: string; text: string; html: string };

/** Sends one message through Resend when a key is set, and through Mailpit otherwise. */
export async function sendPreparedMessage(
  config: ConfigService,
  email: string,
  message: OutboundMail,
): Promise<void> {
  const from = config.get<string>("MAIL_FROM") ?? "Ajar <ajar@localhost>";
  const apiKey = config.get<string>("RESEND_API_KEY");

  if (apiKey) {
    await sendWithResend(apiKey, from, email, message);
    logger.log("Mail accepted by Resend");
    return;
  }

  const host = config.get<string>("SMTP_HOST") ?? "127.0.0.1";
  const port = Number(config.get<string>("SMTP_PORT") ?? 1025);
  const transport = nodemailer.createTransport({ host, port, secure: false });
  await transport.sendMail({
    from,
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html,
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
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status})`);
  }
}
