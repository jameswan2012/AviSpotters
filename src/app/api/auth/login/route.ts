import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { getClientIpFromHeaders } from "@/lib/ip";
import { isAccountBanned } from "@/lib/ban";
import { checkExternalBanAndAutoUnban } from "@/lib/external-ban";
import { normalizePhone } from "@/lib/phone-util";

export async function POST(request: Request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "content_type_invalid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    identifier?: string;
    password?: string;
  };

  const identifier = String(body.identifier || "").trim();
  const password = String(body.password || "");
  if (!identifier || !password) {
    return NextResponse.json({ error: "請輸入帳號與密碼" }, { status: 400 });
  }

  const normalizedEmail = identifier.toLowerCase();
  const normalizedPhone = normalizePhone(identifier);

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { email: normalizedEmail },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        { name: identifier },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      passwordHash: true,
      phone: true,
      deletedAt: true,
    },
    take: 5,
  });

  const user = users[0] || null;
  if (!user) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const localBan = await isAccountBanned(user.id);
  if (localBan) {
    return NextResponse.json(
      {
        error: "account_banned",
        code: "account_banned",
        email: user.email,
        bannedUntil: localBan.bannedUntil ? localBan.bannedUntil.toISOString() : null,
        permanent: !localBan.bannedUntil,
      },
      { status: 403 }
    );
  }

  const externalBan = await checkExternalBanAndAutoUnban({
    email: user.email,
    phone: user.phone,
    username: user.name,
  });
  if (externalBan.blocked) {
    return NextResponse.json(
      {
        error: "account_banned",
        code: "account_banned",
        email: user.email,
        bannedUntil: externalBan.expiresAt || null,
        permanent: !externalBan.expiresAt,
      },
      { status: 403 }
    );
  }

  const token = await createSession({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    name: user.name,
  });
  await setSessionCookie(token);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: getClientIpFromHeaders(request.headers),
      lastLoginUserAgent: request.headers.get("user-agent"),
    },
    select: { id: true },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
    },
  });
}
