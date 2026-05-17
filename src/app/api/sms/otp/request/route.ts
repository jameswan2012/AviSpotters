import { NextResponse } from "next/server";
import { getClientIpFromHeaders } from "@/lib/ip";
import { verifyCaptcha } from "@/lib/captcha";
import { getRegistrationSetting } from "@/lib/site-settings";
import { requestSmsOtp, verifyPhoneBindToken, type SmsVerifyPurpose } from "@/lib/phone-verify";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { isAccountBanned } from "@/lib/ban";
import { checkExternalBanAndAutoUnban } from "@/lib/external-ban";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    purpose?: SmsVerifyPurpose;
    captchaId?: string;
    captchaCode?: string;
    bindToken?: string;
  };

  const purpose = String(body.purpose || "") as SmsVerifyPurpose;
  const allowed: SmsVerifyPurpose[] = ["register", "login_bind_phone", "change_phone"];
  if (!allowed.includes(purpose)) return NextResponse.json({ error: "bad_purpose" }, { status: 400 });

  if (purpose === "register" || purpose === "login_bind_phone") {
    try {
      await verifyCaptcha({ captchaId: String(body.captchaId || ""), code: String(body.captchaCode || "") });
    } catch {
      return NextResponse.json({ error: "captcha_invalid" }, { status: 400 });
    }
  }

  const setting = await getRegistrationSetting();
  if (!setting.phoneFeatureEnabled) {
    return NextResponse.json({ error: "phone_feature_disabled" }, { status: 403 });
  }
  if (purpose === "register" && !setting.phoneRegistrationEnabled) {
    return NextResponse.json({ error: "phone_registration_disabled" }, { status: 403 });
  }

  let userId: string | null = null;
  if (purpose === "login_bind_phone") {
    try {
      const bind = await verifyPhoneBindToken(String(body.bindToken || ""));
      userId = bind.userId;
    } catch {
      return NextResponse.json({ error: "bind_token_invalid" }, { status: 401 });
    }
  } else if (purpose === "change_phone") {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
  }

  try {
    const normalizedPhone = String(body.phone || "").trim();
    if (purpose === "register") {
      const existing = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true, name: true, email: true, phone: true },
      });
      if (existing) {
        const localBan = await isAccountBanned(existing.id);
        if (localBan)
          return NextResponse.json(
            {
              error: "account_banned",
              code: "account_banned",
              type: "account",
              email: existing.email,
              bannedUntil: localBan.bannedUntil ? localBan.bannedUntil.toISOString() : null,
              permanent: !localBan.bannedUntil,
            },
            { status: 403 }
          );
      }
      const externalBan = await checkExternalBanAndAutoUnban({
        phone: normalizedPhone,
        username: existing?.name ?? null,
        email: existing?.email ?? null,
      });
      if (externalBan.blocked)
        return NextResponse.json(
          {
            error: "account_banned",
            code: "account_banned",
            type: "account",
            email: existing?.email ?? null,
            bannedUntil: externalBan.expiresAt || null,
            permanent: !externalBan.expiresAt,
          },
          { status: 403 }
        );
    } else if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true },
      });
      if (user) {
        const localBan = await isAccountBanned(user.id);
        if (localBan)
          return NextResponse.json(
            {
              error: "account_banned",
              code: "account_banned",
              type: "account",
              email: user.email,
              bannedUntil: localBan.bannedUntil ? localBan.bannedUntil.toISOString() : null,
              permanent: !localBan.bannedUntil,
            },
            { status: 403 }
          );
        const externalBan = await checkExternalBanAndAutoUnban({
          username: user.name,
          email: user.email,
          phone: normalizedPhone || user.phone,
        });
        if (externalBan.blocked)
          return NextResponse.json(
            {
              error: "account_banned",
              code: "account_banned",
              type: "account",
              email: user.email,
              bannedUntil: externalBan.expiresAt || null,
              permanent: !externalBan.expiresAt,
            },
            { status: 403 }
          );
      }
    }

    const ip = getClientIpFromHeaders(request.headers);
    const userAgent = request.headers.get("user-agent");
    const r = await requestSmsOtp({
      phone: String(body.phone || ""),
      purpose,
      userId,
      ip,
      userAgent,
    });
    return NextResponse.json({ ok: true, expiresAt: r.expiresAt, cooldownMs: r.cooldownMs, devCode: (r as any).devCode ?? null });
  } catch (e: any) {
    console.error("SMS OTP request failed:", e);
    if (e?.message === "too_fast") {
      const retryAfterMs = Number(e.retryAfterMs || 0) || 0;
      return NextResponse.json({ error: "too_fast", retryAfterMs }, { status: 429 });
    }
    const msg = String(e?.message || "");
    const status =
      msg === "sms_not_configured"
        ? 500
        : msg === "phone_invalid" || msg === "smsbao_phone_invalid"
          ? 400
          : msg === "too_many_requests"
            ? 429
            : 500;
    return NextResponse.json({ error: msg || "sms_send_failed" }, { status });
  }
}
