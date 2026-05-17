import { Resend } from "resend";
import type { SendMailParams, SendMailResult } from "@/lib/mailer";

function envTrim(key: string) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function resolveFromAddress() {
  return envTrim("RESEND_FROM") || envTrim("SMTP_FROM") || "onboarding@resend.dev";
}

export function isResendConfigured() {
  return !!envTrim("RESEND_API_KEY");
}

export async function sendViaResend(
  params: SendMailParams,
  options?: { apiKey?: string; from?: string }
): Promise<SendMailResult> {
  const apiKey = String(options?.apiKey || "").trim() || envTrim("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("resend_not_configured:請將 re_xxxxxxxxx 替換為你的真實 API Key（RESEND_API_KEY）");
  }

  const resend = new Resend(apiKey);
  const from = String(options?.from || "").trim() || resolveFromAddress();
  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  if (error) {
    const msg = typeof error.message === "string" ? error.message : "send_failed";
    throw new Error(`resend_send_failed:${msg}`);
  }

  return {
    accepted: [params.to],
    messageId: typeof data?.id === "string" ? data.id : undefined,
    response: "resend_sent",
  };
}

