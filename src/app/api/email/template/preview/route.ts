import { buildMaintenanceEmail, buildOtpEmail, buildSmtpTestEmail } from "@/lib/email-template";
import { resolveLocale } from "@/i18n/shared";
import type { EmailVerifyPurpose } from "@/lib/email-verify";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "otp").trim().toLowerCase();
  const locale = resolveLocale(url.searchParams.get("locale"));

  let html = "";
  if (type === "test") {
    html = buildSmtpTestEmail({
      to: "demo@example.com",
      sentAtIso: new Date().toISOString(),
      locale,
      logoUrl: `${url.origin}/api/site/logo?variant=light`,
    }).html;
  } else if (type === "maintenance") {
    const message =
      (url.searchParams.get("message") || "").trim() ||
      (locale === "en"
        ? "The site will be temporarily unavailable during scheduled maintenance."
        : locale === "zh-Hans"
          ? "站点将在计划维护期间短暂不可用。"
          : "站點將於排程維護期間短暫不可用。");
    const mail = buildMaintenanceEmail({
      locale,
      subject: url.searchParams.get("subject"),
      message,
      startAtIso: url.searchParams.get("startAt"),
      endAtIso: url.searchParams.get("endAt"),
      logoUrl: `${url.origin}/api/site/logo?variant=light`,
    });
    html = mail.html;
  } else {
    const code = (url.searchParams.get("code") || "483920").trim().replace(/[^\d]/g, "").slice(0, 6) || "483920";
    const purpose = ((url.searchParams.get("purpose") || "register").trim() || "register") as EmailVerifyPurpose;
    html = buildOtpEmail({
      code,
      purpose,
      expiresMinutes: 10,
      locale,
      logoUrl: `${url.origin}/api/site/logo?variant=light`,
    }).html;
  }

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

