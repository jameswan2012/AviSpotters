import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone-util";
import { sendSmsCode } from "@/lib/smsbao";

export type SmsVerifyPurpose = "register" | "login_bind_phone" | "change_phone";

const OTP_EXPIRE_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 10;

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "avispotters-secret-change-in-production");

const ipBurstMap = new Map<string, number[]>();
const IP_BURST_WINDOW_MS = 60 * 1000;
const IP_BURST_LIMIT = 5;

function now() {
  return new Date();
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function makeOtpCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function hashCode(params: { code: string; salt: string }) {
  const pepper = (process.env.SMS_OTP_PEPPER || process.env.JWT_SECRET || "avispotters-sms-otp-pepper").trim();
  return sha256Hex(`${pepper}:${params.salt}:${params.code}`);
}

function hitIpBurst(ip: string | null): boolean {
  if (!ip) return false;
  const t = Date.now();
  const arr = (ipBurstMap.get(ip) || []).filter((v) => t - v < IP_BURST_WINDOW_MS);
  arr.push(t);
  ipBurstMap.set(ip, arr);
  return arr.length > IP_BURST_LIMIT;
}

export async function createPhoneBindToken(params: { userId: string; deviceHash?: string | null; ip?: string | null }) {
  return new SignJWT({
    userId: params.userId,
    deviceHash: params.deviceHash || null,
    ip: params.ip || null,
    type: "phone_bind",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(SECRET);
}

export async function verifyPhoneBindToken(token: string): Promise<{ userId: string; deviceHash: string | null; ip: string | null }> {
  const { payload } = await jwtVerify(String(token || ""), SECRET);
  if (payload?.type !== "phone_bind" || typeof payload?.userId !== "string") {
    throw new Error("bind_token_invalid");
  }
  return {
    userId: payload.userId,
    deviceHash: typeof payload.deviceHash === "string" ? payload.deviceHash : null,
    ip: typeof payload.ip === "string" ? payload.ip : null,
  };
}

export async function requestSmsOtp(params: {
  phone: string;
  purpose: SmsVerifyPurpose;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadataJson?: string | null;
}) {
  const phone = normalizePhone(params.phone);
  if (!phone) throw new Error("phone_invalid");
  if (hitIpBurst(params.ip ?? null)) throw new Error("too_many_requests");

  const latest = await prisma.smsOtp.findFirst({
    where: { phone, purpose: params.purpose, verifiedAt: null, expiresAt: { gt: now() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, lastSentAt: true },
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

  await (latest?.id
    ? prisma.smsOtp.update({
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
      })
    : prisma.smsOtp.create({
        data: {
          phone,
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
      }));

  await sendSmsCode({ phone, code });
  const devCode = process.env.NODE_ENV === "production" ? undefined : code;
  return { ok: true, expiresAt: expiresAt.toISOString(), cooldownMs: OTP_RESEND_COOLDOWN_MS, devCode };
}

export async function verifySmsOtp(params: {
  phone: string;
  purpose: SmsVerifyPurpose;
  code: string;
  userId: string | null;
}) {
  const phone = normalizePhone(params.phone);
  const code = String(params.code || "").trim();
  if (!phone) throw new Error("phone_invalid");
  if (!/^\d{6}$/.test(code)) throw new Error("code_invalid");

  const otp = await prisma.smsOtp.findFirst({
    where: { phone, purpose: params.purpose, verifiedAt: null, expiresAt: { gt: now() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, codeHash: true, salt: true, failedAttempts: true, metadataJson: true },
  });
  if (!otp) throw new Error("code_expired");
  if (otp.failedAttempts >= OTP_MAX_ATTEMPTS) throw new Error("too_many_attempts");
  if (params.userId && otp.userId && otp.userId !== params.userId) throw new Error("forbidden");

  const ok = hashCode({ code, salt: otp.salt }) === otp.codeHash;
  if (!ok) {
    await prisma.smsOtp.update({ where: { id: otp.id }, data: { failedAttempts: { increment: 1 } } });
    throw new Error("code_wrong");
  }

  await prisma.smsOtp.update({ where: { id: otp.id }, data: { verifiedAt: now() } });
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const grant = await prisma.smsVerifyGrant.create({
    data: {
      phone,
      userId: params.userId,
      purpose: params.purpose,
      metadataJson: otp.metadataJson ?? null,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });
  return { ok: true as const, grantId: grant.id, expiresAt: grant.expiresAt.toISOString() };
}

export async function consumeSmsGrant(params: {
  grantId: string;
  purpose: SmsVerifyPurpose;
  userId: string | null;
  phone: string;
}) {
  const id = String(params.grantId || "").trim();
  if (!id) throw new Error("grant_required");
  const phone = normalizePhone(params.phone);
  if (!phone) throw new Error("phone_invalid");

  const grant = await prisma.smsVerifyGrant.findUnique({
    where: { id },
    select: { id: true, phone: true, userId: true, purpose: true, expiresAt: true, consumedAt: true },
  });
  if (!grant) throw new Error("grant_invalid");
  if (grant.consumedAt) throw new Error("grant_used");
  if (grant.expiresAt.getTime() <= Date.now()) throw new Error("grant_expired");
  if (grant.purpose !== params.purpose) throw new Error("grant_mismatch");
  if (grant.phone !== phone) throw new Error("grant_phone_mismatch");
  if (params.userId && grant.userId && grant.userId !== params.userId) throw new Error("forbidden");

  await prisma.smsVerifyGrant.update({ where: { id: grant.id }, data: { consumedAt: now() } });
  return { ok: true as const };
}
