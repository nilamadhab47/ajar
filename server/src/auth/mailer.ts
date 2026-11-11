import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

const logger = new Logger("MagicLinkMail");

/** Sends the one-time link through the local mail catcher. The token is not logged. */
export async function sendMagicLink(
  config: ConfigService,
  email: string,
  token: string,
): Promise<void> {
  const host = config.get<string>("SMTP_HOST") ?? "127.0.0.1";
  const port = Number(config.get<string>("SMTP_PORT") ?? 1025);
  const origin = config.get<string>("APP_ORIGIN") ?? "http://localhost:3000";
  const transport = nodemailer.createTransport({ host, port, secure: false });
  await transport.sendMail({
    from: config.get<string>("MAIL_FROM") ?? "Ajar <ajar@localhost>",
    to: email,
    subject: "Your Ajar sign-in link",
    text: [
      "This link signs you in once and expires in 15 minutes.",
      "",
      `${origin}/login#token=${encodeURIComponent(token)}`,
    ].join("\n"),
  });
  logger.log("Magic link mail accepted by the catcher");
}
