import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { buildOtpEmail } from "@/lib/email-template";
import { resolveLocale, type Locale } from "@/i18n/shared";

export type EmailVerifyPurpose =
  | "register"
  | "deactivate"
  | "photo_delete"
  | "change_password"
  | "change_name"
  | "change_email"
  | "login_device";

const OTP_EXPIRE_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 10;
export const PHOTO_DELETE_VERIFIED_MS = 6 * 60 * 60 * 1000; // verify once, reuse for a while

function now() {
  return new Date();
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function makeOtpCode() {
  // 000000-999999
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashCode(params: { code: string; salt: string }) {
  const pepper = (process.env.EMAIL_OTP_PEPPER || process.env.JWT_SECRET || "avispotters-otp-pepper").trim();
  return sha256Hex(`${pepper}:${params.salt}:${params.code}`);
}

function resolveBaseUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function requestEmailOtp(params: {
  email: string;
  purpose: EmailVerifyPurpose;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  locale?: Locale | null;
  metadataJson?: string | null;
}) {
  const email = normalizeEmail(params.email);
  if (!email) throw new Error("email_required");

  const latest = await prisma.emailOtp.findFirst({
    where: { email, purpose: params.purpose, verifiedAt: null, expiresAt: { gt: now() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, lastSentAt: true, createdAt: true },
  });

  const lastSentAt = latest?.lastSentAt ?? null;
  if (lastSentAt && Date.now() - lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const retryAfterMs = OTP_RESEND_COOLDOWN_MS - (Date.now() - lastSentAt.getTime());
    const e: any = new Error("too_fast");
    e.retryAfterMs = retryAfterMs;
    throw e;
  }

  const code = makeOtpCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const codeHash = hashCode({ code, salt });
  const expiresAt = new Date(Date.now() + OTP_EXPIRE_MS);

  const row =
    latest?.id
      ? await prisma.emailOtp.update({
          where: { id: latest.id },
          data: {
            userId: params.userId,
            codeHash,
            salt,
            expiresAt,
            failedAttempts: 0,
            verifiedAt: null,
            lastSentAt: now(),
            ip: params.ip ?? undefined,
            userAgent: params.userAgent ?? undefined,
            metadataJson: params.metadataJson ?? undefined,
          },
          select: { id: true },
        })
      : await prisma.emailOtp.create({
          data: {
            email,
            userId: params.userId,
            purpose: params.purpose,
            codeHash,
            salt,
            expiresAt,
            lastSentAt: now(),
            ip: params.ip,
            userAgent: params.userAgent,
            metadataJson: params.metadataJson ?? null,
          },
          select: { id: true },
        });

  const locale = resolveLocale(params.locale);
  const subject = locale === "en" ? "AviSpotters Verification Code" : locale === "zh-Hans" ? "AviSpotters 验证码" : "AviSpotters 驗證碼";
  const logoUrl = `${resolveBaseUrl()}/api/site/logo?variant=light`;
  const mail = buildOtpEmail({ code, purpose: params.purpose, expiresMinutes: 10, locale, logoUrl });
  await sendMail({ to: email, subject, text: mail.text, html: mail.html });

  // In development, allow UI to show code when SMTP isn't configured.
  const devCode = process.env.NODE_ENV === "production" ? undefined : code;
  return { ok: true, otpId: row.id, expiresAt: expiresAt.toISOString(), cooldownMs: OTP_RESEND_COOLDOWN_MS, devCode };
}

export async function verifyEmailOtp(params: {
  email: string;
  purpose: EmailVerifyPurpose;
  code: string;
  userId: string | null;
}) {
  const email = normalizeEmail(params.email);
  const code = String(params.code || "").trim();
  if (!email) throw new Error("email_required");
  if (!/^\d{6}$/.test(code)) throw new Error("code_invalid");

  const otp = await prisma.emailOtp.findFirst({
    where: { email, purpose: params.purpose, verifiedAt: null, expiresAt: { gt: now() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, codeHash: true, salt: true, failedAttempts: true, expiresAt: true, metadataJson: true },
  });
  if (!otp) throw new Error("code_expired");
  if (otp.failedAttempts >= OTP_MAX_ATTEMPTS) throw new Error("too_many_attempts");

  // For logged-in purposes, make sure the OTP is for the same user.
  if (params.userId && otp.userId && otp.userId !== params.userId) throw new Error("forbidden");

  const ok = hashCode({ code, salt: otp.salt }) === otp.codeHash;
  if (!ok) {
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { failedAttempts: { increment: 1 } }, select: { id: true } });
    throw new Error("code_wrong");
  }

  await prisma.emailOtp.update({ where: { id: otp.id }, data: { verifiedAt: now() }, select: { id: true } });

  // photo_delete uses "verified until" on user, not one-time grant
  if (params.purpose === "photo_delete") {
    if (!params.userId) throw new Error("unauthorized");
    const until = new Date(Date.now() + PHOTO_DELETE_VERIFIED_MS);
    await prisma.user.update({ where: { id: params.userId }, data: { photoDeleteVerifiedUntil: until }, select: { id: true } });
    return { ok: true as const, verifiedUntil: until.toISOString() };
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // grants are short-lived
  const grant = await prisma.emailVerifyGrant.create({
    data: {
      email,
      userId: params.userId,
      purpose: params.purpose,
      metadataJson: otp.metadataJson ?? null,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });

  return { ok: true as const, grantId: grant.id, expiresAt: grant.expiresAt.toISOString() };
}

export async function consumeGrant(params: { grantId: string; purpose: Exclude<EmailVerifyPurpose, "photo_delete">; userId: string | null; email: string | null; metadataMatch?: (metadataJson: string | null) => boolean }) {
  const id = String(params.grantId || "").trim();
  if (!id) throw new Error("grant_required");

  const grant = await prisma.emailVerifyGrant.findUnique({
    where: { id },
    select: { id: true, email: true, userId: true, purpose: true, expiresAt: true, consumedAt: true, metadataJson: true },
  });
  if (!grant) throw new Error("grant_invalid");
  if (grant.consumedAt) throw new Error("grant_used");
  if (grant.expiresAt.getTime() <= Date.now()) throw new Error("grant_expired");
  if (grant.purpose !== params.purpose) throw new Error("grant_mismatch");
  if (params.userId && grant.userId && grant.userId !== params.userId) throw new Error("forbidden");
  if (params.email && grant.email !== normalizeEmail(params.email)) throw new Error("grant_email_mismatch");
  if (params.metadataMatch && !params.metadataMatch(grant.metadataJson ?? null)) throw new Error("grant_metadata_mismatch");

  await prisma.emailVerifyGrant.update({ where: { id: grant.id }, data: { consumedAt: now() }, select: { id: true } });
  return { ok: true as const };
}

