import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { sendMail } from "@/lib/mailer";
import { buildSmtpTestEmail } from "@/lib/email-template";
import { getServerLocaleOnly } from "@/i18n/server";
import { getEmailDeliverySettingForSend } from "@/lib/site-settings";

function resolveBaseUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function POST(request: Request) {
  const locale = await getServerLocaleOnly();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { to?: string };
  const to = typeof body.to === "string" && body.to.trim() ? body.to.trim().toLowerCase() : user.email;
  const delivery = await getEmailDeliverySettingForSend().catch(() => null);
  const mailProvider = delivery?.provider || (process.env.MAIL_PROVIDER || "").trim().toLowerCase() || "auto";

  try {
    const sentAt = new Date().toISOString();
    const logoUrl = `${resolveBaseUrl()}/api/site/logo?variant=light`;
    const mail = buildSmtpTestEmail({ to, sentAtIso: sentAt, locale, logoUrl });
    const info = await sendMail({
      to,
      subject: locale === "en" ? "AviSpotters Mail Test Email" : locale === "zh-Hans" ? "AviSpotters 邮件测试" : "AviSpotters 郵件測試",
      text: mail.text,
      html: mail.html,
    });
    const responseTag = String(info.response || "");
    const channel =
      responseTag.startsWith("resend_")
        ? "resend_api"
        : responseTag.startsWith("local_mailbox:")
          ? "local_mailbox"
          : "smtp";
    return NextResponse.json({
      ok: true,
      to,
      provider: mailProvider,
      channel,
      // internal test endpoint success != external provider delivery
      info,
      upstreamHint:
        channel === "resend_api"
          ? {
              docs: "https://resend.com/docs/introduction",
              envKey: "RESEND_API_KEY",
              fromKey: "RESEND_FROM",
            }
          : undefined,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: String(e?.message || "send_failed"),
        provider: mailProvider,
        upstreamHint:
          mailProvider === "resend"
            ? {
                docs: "https://resend.com/docs/introduction",
                envKey: "RESEND_API_KEY",
                fromKey: "RESEND_FROM",
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}

