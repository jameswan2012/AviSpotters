import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { requestEmailOtp, type EmailVerifyPurpose } from "@/lib/email-verify";
import { resolveLocale } from "@/i18n/shared";
import { prisma } from "@/lib/db";
import { isAccountBanned } from "@/lib/ban";
import { checkExternalBanAndAutoUnban } from "@/lib/external-ban";

function smtpPublicError(e: any): { error: string; meta?: any } {
  const code = typeof e?.code === "string" ? e.code : "";
  const responseCode = Number.isFinite(Number(e?.responseCode)) ? Number(e.responseCode) : null;
  const command = typeof e?.command === "string" ? e.command : null;
  const response = typeof e?.response === "string" ? e.response : null;

  // nodemailer uses codes like: EAUTH, ECONNECTION, ETIMEDOUT, EENVELOPE, etc.
  if (code === "EAUTH" || responseCode === 535) return { error: "smtp_auth_failed" };
  if (code === "EENVELOPE" || responseCode === 550 || responseCode === 553) return { error: "smtp_from_rejected" };
  if (code === "ETIMEDOUT") return { error: "smtp_timeout" };
  if (code === "ECONNECTION" || code === "ESOCKET" || code === "EHOSTUNREACH") return { error: "smtp_connect_failed" };
  if (code === "ENOTFOUND") return { error: "smtp_dns_failed" };
  if (code === "ESECURE") return { error: "smtp_tls_failed" };

  // fallback: hide sensitive details but keep minimal diagnostics
  const meta = responseCode || command || response ? { responseCode, command, response } : undefined;
  return { error: "smtp_send_failed", meta };
}

function getIp(request: Request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xr = request.headers.get("x-real-ip");
  return xr?.trim() || null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; purpose?: string; locale?: string };
  const purpose = (body.purpose ?? "").trim() as EmailVerifyPurpose;
  const emailRaw = typeof body.email === "string" ? body.email : "";
  const locale = resolveLocale(typeof body.locale === "string" ? body.locale : null);

  const allowed: EmailVerifyPurpose[] = ["register", "deactivate", "photo_delete", "change_password", "change_name", "change_email"];
  if (!allowed.includes(purpose)) return NextResponse.json({ error: "bad_purpose" }, { status: 400 });

  const user = purpose === "register" ? null : await getCurrentUser();
  if (purpose !== "register" && !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email =
    purpose === "register"
      ? emailRaw
      : purpose === "change_email"
        ? emailRaw
        : user?.email ?? "";

  if (!email || typeof email !== "string") return NextResponse.json({ error: "email_required" }, { status: 400 });

  // For non-register purposes, ensure we're not sending to an arbitrary address.
  if (user && purpose !== "change_email" && email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (user && purpose === "change_email") {
    const newEmail = email.trim().toLowerCase();
    if (!newEmail) return NextResponse.json({ error: "email_required" }, { status: 400 });
    if (newEmail === user.email.trim().toLowerCase()) return NextResponse.json({ error: "email_same" }, { status: 400 });
  }

  const ip = getIp(request);
  const userAgent = request.headers.get("user-agent");

  try {
    if (purpose === "register") {
      const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
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
        email: email.trim().toLowerCase(),
        username: existing?.name ?? null,
        phone: existing?.phone ?? null,
      });
      if (externalBan.blocked)
        return NextResponse.json(
          {
            error: "account_banned",
            code: "account_banned",
            type: "account",
            email: email.trim().toLowerCase(),
            bannedUntil: externalBan.expiresAt || null,
            permanent: !externalBan.expiresAt,
          },
          { status: 403 }
        );
    } else if (user) {
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
        email: user.email,
        username: user.name,
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

    const metadataJson =
      user && purpose === "change_email" ? JSON.stringify({ newEmail: String(emailRaw || "").trim().toLowerCase() }) : null;

    const r = await requestEmailOtp({
      email,
      purpose,
      userId: user?.id ?? null,
      ip,
      userAgent,
      locale,
      metadataJson,
    });
    return NextResponse.json({ ok: true, expiresAt: r.expiresAt, cooldownMs: r.cooldownMs, devCode: (r as any).devCode ?? null });
  } catch (e: any) {
    if (e?.message === "too_fast") {
      const retryAfterMs = Number(e.retryAfterMs || 0) || 0;
      return NextResponse.json({ error: "too_fast", retryAfterMs }, { status: 429 });
    }
    if (String(e?.message || "") === "mail_not_configured") return NextResponse.json({ error: "mail_not_configured" }, { status: 500 });
    const pub = smtpPublicError(e);
    return NextResponse.json(pub, { status: 500 });
  }
}

