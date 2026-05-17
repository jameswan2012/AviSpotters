import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeGrant } from "@/lib/email-verify";
import { consumeSmsGrant } from "@/lib/phone-verify";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/auth";
import { normalizeNickname, validateNicknameFormat, isNicknameTaken } from "@/lib/nickname";
import { normalizePhone } from "@/lib/phone-util";
import { getRegistrationSetting } from "@/lib/site-settings";
import { getClientIpFromHeaders } from "@/lib/ip";
import { checkExternalBanAndAutoUnban } from "@/lib/external-ban";

export async function POST(request: Request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "content_type_invalid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string | null;
    email?: string | null;
    password?: string;
    phone?: string | null;
    verifyGrantId?: string;
    smsGrantId?: string;
    captchaId?: string;
    captchaCode?: string;
  };

  const setting = await getRegistrationSetting();
  if (!setting.enabled) {
    return NextResponse.json({ error: "registration_disabled" }, { status: 403 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const phone = body.phone ? normalizePhone(body.phone) : "";
  const normalizedName = normalizeNickname(String(body.name || ""));

  if (!email) return NextResponse.json({ error: "email_required" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "password_too_short" }, { status: 400 });

  const fmt = validateNicknameFormat(normalizedName);
  if (!fmt.ok) return NextResponse.json({ error: fmt.error || "nickname_invalid" }, { status: 400 });
  if (await isNicknameTaken(normalizedName)) {
    return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { id: true, email: true },
  });
  if (existing) {
    return NextResponse.json({ error: "email_or_phone_taken" }, { status: 409 });
  }

  const externalBan = await checkExternalBanAndAutoUnban({
    email,
    phone: phone || null,
    username: normalizedName,
  });
  if (externalBan.blocked) {
    return NextResponse.json(
      {
        error: "account_banned",
        code: "account_banned",
        email,
        bannedUntil: externalBan.expiresAt || null,
        permanent: !externalBan.expiresAt,
      },
      { status: 403 }
    );
  }

  try {
    await consumeGrant({
      grantId: String(body.verifyGrantId || ""),
      purpose: "register",
      userId: null,
      email,
    });
  } catch {
    return NextResponse.json({ error: "email_verify_required" }, { status: 409 });
  }

  if (phone) {
    if (!setting.phoneFeatureEnabled || !setting.phoneRegistrationEnabled) {
      return NextResponse.json({ error: "phone_registration_disabled" }, { status: 403 });
    }
    try {
      await consumeSmsGrant({
        grantId: String(body.smsGrantId || ""),
        purpose: "register",
        userId: null,
        phone,
      });
    } catch {
      return NextResponse.json({ error: "phone_verify_required" }, { status: 409 });
    }
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      email,
      phone: phone || null,
      phoneVerifiedAt: phone ? now : null,
      passwordHash,
      name: normalizedName,
      roleId: 0,
      createdIp: getClientIpFromHeaders(request.headers),
      createdUserAgent: request.headers.get("user-agent"),
      lastLoginAt: now,
      lastLoginIp: getClientIpFromHeaders(request.headers),
      lastLoginUserAgent: request.headers.get("user-agent"),
    },
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
    },
  });

  const token = await createSession({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    name: user.name,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, user });
}
