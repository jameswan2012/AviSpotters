import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/ban";
import { requestEmailOtp } from "@/lib/email-verify";
import { getServerLocaleOnly } from "@/i18n/server";

export async function POST(request: Request) {
  const locale = await getServerLocaleOnly();
  const body = (await request.json().catch(() => ({}))) as { challengeId?: string };
  const challengeId = String(body.challengeId ?? "").trim();
  if (!challengeId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const ch = await prisma.loginDeviceChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, userId: true, expiresAt: true, verifiedAt: true },
  });
  if (!ch || ch.verifiedAt || ch.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "challenge_expired" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: ch.userId }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(request.headers);
  const ua = request.headers.get("user-agent");
  try {
    const r = await requestEmailOtp({
      email: user.email,
      purpose: "login_device",
      userId: user.id,
      ip: ip ?? null,
      userAgent: ua ?? null,
      locale,
      metadataJson: JSON.stringify({ challengeId: ch.id }),
    });
    return NextResponse.json({ ok: true, expiresAt: r.expiresAt, cooldownMs: r.cooldownMs });
  } catch (e: any) {
    if (e?.message === "too_fast") {
      const retryAfterMs = Number(e.retryAfterMs || 0) || 0;
      return NextResponse.json({ error: "too_fast", retryAfterMs }, { status: 429 });
    }
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}

