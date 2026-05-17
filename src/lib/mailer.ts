import nodemailer from "nodemailer";
import { saveLocalMail } from "@/lib/local-mailbox";
import { isResendConfigured, sendViaResend } from "@/lib/mail-resend";
import { isGeeksendConfigured, sendViaGeeksend } from "@/lib/mail-geeksend";

export type SendMailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendMailResult = {
  accepted: string[];
  messageId?: string;
  response?: string;
};

function trimEnv(key: string) {
  return String(process.env[key] || "").trim();
}

function shouldUseLocalMailbox() {
  return process.env.LOCAL_MAIL_MODE === "1" || process.env.NODE_ENV !== "production";
}

async function sendViaSmtp(params: SendMailParams): Promise<SendMailResult> {
  const host = trimEnv("SMTP_HOST");
  const port = Number(trimEnv("SMTP_PORT") || 587);
  const user = trimEnv("SMTP_USER");
  const pass = trimEnv("SMTP_PASS");
  const from = trimEnv("SMTP_FROM") || user;
  if (!host || !from) throw new Error("smtp_not_configured");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  const info = await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  return {
    accepted: [params.to],
    messageId: info.messageId,
    response: typeof info.response === "string" ? info.response : "smtp_sent",
  };
}

export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const provider = trimEnv("MAIL_PROVIDER").toLowerCase();

  if (provider === "resend" && isResendConfigured()) {
    return sendViaResend(params);
  }
  if (provider === "geeksend" && isGeeksendConfigured()) {
    return sendViaGeeksend(params);
  }
  if (provider === "smtp") {
    return sendViaSmtp(params);
  }

  if (isResendConfigured()) return sendViaResend(params);
  if (isGeeksendConfigured()) return sendViaGeeksend(params);

  if (shouldUseLocalMailbox()) {
    const saved = await saveLocalMail(params);
    return {
      accepted: [params.to],
      messageId: saved?.id,
      response: saved ? `local_mailbox:${saved.id}` : "local_mailbox",
    };
  }

  return sendViaSmtp(params);
}
