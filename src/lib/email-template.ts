import { resolveLocale, type Locale } from "@/i18n/shared";
import type { EmailVerifyPurpose } from "@/lib/email-verify";

function esc(s: string) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function envTrim(key: string) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function resolveBaseUrl() {
  return envTrim("APP_URL") || envTrim("NEXT_PUBLIC_APP_URL") || envTrim("SITE_URL") || "http://localhost:3000";
}

const FALLBACK_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 28" height="28" width="120">
  <text x="0" y="22" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="20" font-weight="800" fill="#ffffff">AviSpotters</text>
</svg>`;

function resolveDefaultLogoUrl() {
  return `${resolveBaseUrl().replace(/\/+$/, "")}/api/site/logo?variant=light`;
}

function tr(locale: Locale, zhHant: string, zhHans: string, en: string) {
  if (locale === "en") return en;
  if (locale === "zh-Hans") return zhHans;
  return zhHant;
}

function renderLayout(params: { title: string; subtitle?: string; bodyHtml: string; footerNote?: string; logoUrl?: string | null }) {
  const title = esc(params.title);
  const subtitle = params.subtitle ? esc(params.subtitle) : "";
  const footer = esc(params.footerNote || "This is an automated message from AviSpotters.");
  const logoUrl = typeof params.logoUrl === "string" && params.logoUrl.trim() ? params.logoUrl.trim() : resolveDefaultLogoUrl();
  const logoBlock = `<img src="${esc(logoUrl)}" alt="AviSpotters" width="120" height="28" style="height:28px;width:auto;display:block;max-width:120px;object-fit:contain;" />`;
  const fallbackLogoBlock = `<span style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:20px;font-weight:800;color:#ffffff;">AviSpotters</span>`;
  const displayLogoBlock = `<img src="${esc(logoUrl)}" alt="AviSpotters" width="120" height="28" style="height:28px;width:auto;display:block;max-width:120px;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';" /><span style="display:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:18px;font-weight:800;color:#ffffff;">AviSpotters</span>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;color:#0f172a;">
  <div style="padding:28px 14px;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(2,6,23,0.08);">
      <div style="padding:22px 24px;background:linear-gradient(120deg,#0ea5e9,#2563eb);color:#e0f2fe;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>${displayLogoBlock}</div>
          <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.95;white-space:nowrap;">AviSpotters</div>
        </div>
        <div style="margin-top:8px;font-size:22px;font-weight:700;color:#ffffff;">${title}</div>
        ${subtitle ? `<div style="margin-top:8px;font-size:13px;color:#e0f2fe;">${subtitle}</div>` : ""}
      </div>
      <div style="padding:24px;">
        ${params.bodyHtml}
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12px;color:#64748b;">
        ${footer}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getPurposeLabel(purpose: EmailVerifyPurpose, locale: Locale) {
  switch (purpose) {
    case "register":
      return tr(locale, "註冊", "注册", "Registration");
    case "deactivate":
      return tr(locale, "註銷帳號", "注销账号", "Account deactivation");
    case "photo_delete":
      return tr(locale, "刪除作品", "删除作品", "Photo deletion");
    case "change_password":
      return tr(locale, "修改密碼", "修改密码", "Change password");
    case "change_name":
      return tr(locale, "修改暱稱", "修改昵称", "Change display name");
    case "change_email":
      return tr(locale, "更換信箱", "更换邮箱", "Change email");
    case "login_device":
      return tr(locale, "新裝置登入確認", "新设备登录确认", "New device login verification");
    default:
      return tr(locale, "安全驗證", "安全验证", "Security verification");
  }
}

function textToHtmlParagraphs(text: string) {
  const blocks = String(text || "")
    .split(/\n{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!blocks.length) return "";
  return blocks
    .map((b) => `<p style="margin:0 0 12px 0;">${esc(b).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

export function buildOtpEmail(params: { code: string; purpose: EmailVerifyPurpose; expiresMinutes: number; locale?: Locale | null; logoUrl?: string | null }) {
  const code = esc(params.code);
  const locale = resolveLocale(params.locale);
  const purpose = esc(getPurposeLabel(params.purpose, locale));
  const expiresMinutes = Math.max(1, Math.floor(params.expiresMinutes || 10));
  const codeFontSize = params.purpose === "change_password" ? 42 : 30;
  const text = `${tr(locale, "你的驗證碼是：", "你的验证码是：", "Your verification code is: ")}${params.code}

${tr(locale, "用途：", "用途：", "Purpose: ")}${getPurposeLabel(params.purpose, locale)}
${tr(locale, "有效期：", "有效期：", "Expires in: ")}${expiresMinutes} ${tr(locale, "分鐘", "分钟", "minutes")}

${tr(locale, "若非本人操作，請忽略此郵件。", "若非本人操作，请忽略此邮件。", "If this wasn't you, please ignore this email.")}`;
  const html = renderLayout({
    title: tr(locale, "郵箱驗證碼", "邮箱验证码", "Email verification code"),
    subtitle: tr(locale, "請在頁面輸入以下 6 位驗證碼完成驗證", "请在页面输入以下 6 位验证码完成验证", "Enter the 6-digit code on the page to continue"),
    logoUrl: params.logoUrl,
    bodyHtml: `
      <div style="font-size:14px;line-height:1.8;color:#334155;">
        <p style="margin:0 0 14px 0;">${tr(locale, "你好，", "你好，", "Hello,")}</p>
        <p style="margin:0 0 18px 0;">${tr(locale, "你正在進行", "你正在进行", "You are requesting")} <strong>${purpose}</strong> ${tr(locale, "操作，請使用下面的驗證碼：", "操作，请使用下面的验证码：", ". Please use the code below:")}</p>
      </div>
      <div style="margin:0 auto 20px auto;max-width:320px;text-align:center;padding:14px 16px;border-radius:12px;border:1px solid #bae6fd;background:#f0f9ff;">
        <div style="font-size:${codeFontSize}px;line-height:1;letter-spacing:0.22em;font-weight:800;color:#0c4a6e;">${code}</div>
      </div>
      <div style="font-size:13px;line-height:1.7;color:#475569;">
        <p style="margin:0;">${tr(locale, "驗證碼將在", "验证码将在", "This code expires in")} <strong>${expiresMinutes} ${tr(locale, "分鐘", "分钟", "minutes")}</strong> ${tr(locale, "後過期。", "后过期。", ".")}</p>
        <p style="margin:8px 0 0 0;">${tr(locale, "若非本人操作，請忽略此郵件。", "如果这不是你本人的操作，请忽略此邮件。", "If this wasn't you, please ignore this email.")}</p>
      </div>
    `,
    footerNote: tr(
      locale,
      "AviSpotters 安全郵件，請勿直接回覆此信。",
      "AviSpotters 安全邮件，请勿直接回复此信。",
      "AviSpotters security mail. Please do not reply directly."
    ),
  });
  return { text, html };
}

export function buildSmtpTestEmail(params: { to: string; sentAtIso: string; locale?: Locale | null; logoUrl?: string | null }) {
  const to = esc(params.to);
  const locale = resolveLocale(params.locale);
  const sentAt = esc(params.sentAtIso);
  const text = `${tr(locale, "這是一封測試郵件。", "这是一封测试邮件。", "This is a test email.")}

${tr(locale, "發送時間：", "发送时间：", "Sent at: ")}${params.sentAtIso}
${tr(locale, "收件人：", "收件人：", "Recipient: ")}${params.to}
`;
  const html = renderLayout({
    title: tr(locale, "SMTP 測試成功", "SMTP 测试成功", "SMTP test succeeded"),
    subtitle: tr(locale, "你的郵件配置已可正常發送", "你的邮件配置已可正常发送", "Your mail configuration is working"),
    logoUrl: params.logoUrl,
    bodyHtml: `
      <div style="font-size:14px;line-height:1.8;color:#334155;">
        <p style="margin:0 0 10px 0;">${tr(locale, "這是一封來自 AviSpotters 的 SMTP 測試郵件。", "这是一封来自 AviSpotters 的 SMTP 测试邮件。", "This is an SMTP test email from AviSpotters.")}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;">
          <tr>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;color:#475569;">${tr(locale, "發送時間", "发送时间", "Sent at")}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;color:#0f172a;">${sentAt}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;color:#475569;">${tr(locale, "收件人", "收件人", "Recipient")}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;color:#0f172a;">${to}</td>
          </tr>
        </table>
      </div>
    `,
    footerNote: tr(
      locale,
      "若非你本人發起，可忽略此郵件。",
      "若非你本人发起，可忽略此邮件。",
      "If you received this unexpectedly, you can ignore this message."
    ),
  });
  return { text, html };
}

export function buildMaintenanceEmail(params: {
  locale?: Locale | null;
  subject?: string | null;
  message: string;
  startAtIso?: string | null;
  endAtIso?: string | null;
  logoUrl?: string | null;
}) {
  const locale = resolveLocale(params.locale);
  const subject = (params.subject || "").trim() || tr(locale, "網站維護通知", "网站维护通知", "Maintenance notice");
  const message = String(params.message || "").trim();
  const startAt = String(params.startAtIso || "").trim();
  const endAt = String(params.endAtIso || "").trim();
  const text = [
    subject,
    "",
    message || tr(locale, "站點將進行維護，部分功能可能暫時不可用。", "站点将进行维护，部分功能可能暂时不可用。", "The site will undergo maintenance and some features may be unavailable."),
    startAt ? `${tr(locale, "開始：", "开始：", "Start: ")}${startAt}` : "",
    endAt ? `${tr(locale, "結束：", "结束：", "End: ")}${endAt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const html = renderLayout({
    title: subject,
    subtitle: tr(locale, "AviSpotters 系統通知", "AviSpotters 系统通知", "AviSpotters system notice"),
    logoUrl: params.logoUrl,
    bodyHtml: `
      <div style="font-size:14px;line-height:1.8;color:#334155;">
        ${message ? textToHtmlParagraphs(message) : `<p style="margin:0 0 12px 0;">${tr(locale, "站點將進行維護，部分功能可能暫時不可用。", "站点将进行维护，部分功能可能暂时不可用。", "The site will undergo maintenance and some features may be unavailable.")}</p>`}
        ${startAt ? `<p style="margin:8px 0 0 0;"><strong>${tr(locale, "開始：", "开始：", "Start: ")}</strong>${esc(startAt)}</p>` : ""}
        ${endAt ? `<p style="margin:4px 0 0 0;"><strong>${tr(locale, "結束：", "结束：", "End: ")}</strong>${esc(endAt)}</p>` : ""}
      </div>
    `,
    footerNote: tr(locale, "此為系統通知郵件。", "此为系统通知邮件。", "This is a system notification."),
  });
  return { subject, text, html };
}

export function buildAnnouncementEmail(params: {
  locale?: Locale | null;
  subject: string;
  content: string;
  logoUrl?: string | null;
}) {
  const locale = resolveLocale(params.locale);
  const subject = String(params.subject || "").trim() || tr(locale, "站內通知", "站内通知", "Site announcement");
  const content = String(params.content || "").trim();
  const text = `${subject}\n\n${content}`;
  const html = renderLayout({
    title: subject,
    subtitle: tr(locale, "AviSpotters 郵件通知", "AviSpotters 邮件通知", "AviSpotters email notice"),
    logoUrl: params.logoUrl,
    bodyHtml: `
      <div style="font-size:14px;line-height:1.8;color:#334155;">
        ${textToHtmlParagraphs(content || tr(locale, "（無內容）", "（无内容）", "(No content)"))}
      </div>
    `,
    footerNote: tr(locale, "此郵件由管理員發布。", "此邮件由管理员发布。", "Sent by an administrator."),
  });
  return { subject, text, html };
}

export function buildPhotoReviewEmail(params: {
  locale?: Locale | null;
  decision: "approved" | "rejected";
  registration: string;
  title?: string | null;
  reason?: string | null;
  previewImageUrl?: string | null;
  photoPageUrl?: string | null;
  logoUrl?: string | null;
}) {
  const locale = resolveLocale(params.locale);
  const approved = params.decision === "approved";
  const registration = String(params.registration || "").trim() || "-";
  const photoTitle = String(params.title || "").trim();
  const reason = String(params.reason || "").trim();
  const photoPageUrl = String(params.photoPageUrl || "").trim();
  const previewImageUrl = String(params.previewImageUrl || "").trim();
  const subject = approved
    ? tr(locale, "你的圖片已通過審核", "你的图片已通过审核", "Your photo has been approved")
    : tr(locale, "你的圖片未通過審核", "你的图片未通过审核", "Your photo was not approved");
  const text = [
    subject,
    "",
    `${tr(locale, "註冊號", "注册号", "Registration")}: ${registration}`,
    photoTitle ? `${tr(locale, "標題", "标题", "Title")}: ${photoTitle}` : "",
    !approved && reason ? `${tr(locale, "拒絕原因", "拒绝原因", "Review note")}: ${reason}` : "",
    photoPageUrl ? `${tr(locale, "查看詳情", "查看详情", "View details")}: ${photoPageUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderLayout({
    title: subject,
    subtitle: approved
      ? tr(locale, "作品審核結果：已通過", "作品审核结果：已通过", "Review result: approved")
      : tr(locale, "作品審核結果：未通過", "作品审核结果：未通过", "Review result: rejected"),
    logoUrl: params.logoUrl,
    bodyHtml: `
      <div style="font-size:14px;line-height:1.8;color:#334155;">
        <p style="margin:0 0 8px 0;"><strong>${tr(locale, "註冊號", "注册号", "Registration")}：</strong>${esc(registration)}</p>
        ${photoTitle ? `<p style="margin:0 0 12px 0;"><strong>${tr(locale, "標題", "标题", "Title")}：</strong>${esc(photoTitle)}</p>` : ""}
        ${
          !approved && reason
            ? `<p style="margin:0 0 12px 0;"><strong>${tr(locale, "拒絕原因", "拒绝原因", "Review note")}：</strong>${esc(reason)}</p>`
            : ""
        }
      </div>
      ${
        previewImageUrl
          ? `<div style="margin:12px 0 16px 0;">
              <img src="${esc(previewImageUrl)}" alt="${tr(locale, "圖片預覽", "图片预览", "Photo preview")}" style="width:100%;max-width:560px;border-radius:12px;border:1px solid #e2e8f0;display:block;" />
            </div>`
          : ""
      }
      ${
        photoPageUrl
          ? `<div style="margin-top:8px;">
              <a href="${esc(photoPageUrl)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:600;">${tr(locale, "查看圖片詳情", "查看图片详情", "View photo details")}</a>
            </div>`
          : ""
      }
    `,
    footerNote: tr(locale, "此郵件由系統自動發送。", "此邮件由系统自动发送。", "This email is sent automatically."),
  });
  return { subject, text, html };
}

export function buildAppealReviewEmail(params: {
  locale?: Locale | null;
  status: "accepted" | "dismissed";
  registration: string;
  title?: string | null;
  staffReply?: string | null;
  previewImageUrl?: string | null;
  photoPageUrl?: string | null;
  logoUrl?: string | null;
}) {
  const locale = resolveLocale(params.locale);
  const accepted = params.status === "accepted";
  const registration = String(params.registration || "").trim() || "-";
  const photoTitle = String(params.title || "").trim();
  const staffReply = String(params.staffReply || "").trim();
  const photoPageUrl = String(params.photoPageUrl || "").trim();
  const previewImageUrl = String(params.previewImageUrl || "").trim();
  const subject = accepted
    ? tr(locale, "你的申訴已通過", "你的申诉已通过", "Your appeal has been accepted")
    : tr(locale, "你的申訴已被駁回", "你的申诉已被驳回", "Your appeal has been dismissed");
  const text = [
    subject,
    "",
    `${tr(locale, "註冊號", "注册号", "Registration")}: ${registration}`,
    photoTitle ? `${tr(locale, "標題", "标题", "Title")}: ${photoTitle}` : "",
    staffReply ? `${tr(locale, "審核回覆", "审核回复", "Staff reply")}: ${staffReply}` : "",
    photoPageUrl ? `${tr(locale, "查看詳情", "查看详情", "View details")}: ${photoPageUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderLayout({
    title: subject,
    subtitle: accepted
      ? tr(locale, "申訴結果：已通過，作品將重新進入審核流程", "申诉结果：已通过，作品将重新进入审核流程", "Appeal result: accepted, photo will be reviewed again")
      : tr(locale, "申訴結果：已駁回", "申诉结果：已驳回", "Appeal result: dismissed"),
    logoUrl: params.logoUrl,
    bodyHtml: `
      <div style="font-size:14px;line-height:1.8;color:#334155;">
        <p style="margin:0 0 8px 0;"><strong>${tr(locale, "註冊號", "注册号", "Registration")}：</strong>${esc(registration)}</p>
        ${photoTitle ? `<p style="margin:0 0 12px 0;"><strong>${tr(locale, "標題", "标题", "Title")}：</strong>${esc(photoTitle)}</p>` : ""}
        ${staffReply ? `<p style="margin:0 0 12px 0;"><strong>${tr(locale, "審核回覆", "审核回复", "Staff reply")}：</strong>${esc(staffReply)}</p>` : ""}
      </div>
      ${
        previewImageUrl
          ? `<div style="margin:12px 0 16px 0;">
              <img src="${esc(previewImageUrl)}" alt="${tr(locale, "圖片預覽", "图片预览", "Photo preview")}" style="width:100%;max-width:560px;border-radius:12px;border:1px solid #e2e8f0;display:block;" />
            </div>`
          : ""
      }
      ${
        photoPageUrl
          ? `<div style="margin-top:8px;">
              <a href="${esc(photoPageUrl)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:600;">${tr(locale, "查看圖片詳情", "查看图片详情", "View photo details")}</a>
            </div>`
          : ""
      }
    `,
    footerNote: tr(locale, "此郵件由系統自動發送。", "此邮件由系统自动发送。", "This email is sent automatically."),
  });
  return { subject, text, html };
}

