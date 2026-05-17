import type { Headers } from "next/dist/compiled/@edge-runtime/primitives";
import { prisma } from "@/lib/db";

function firstIpFromForwardedFor(v: string) {
  const raw = v.split(",")[0]?.trim();
  return raw || null;
}

export function getClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return firstIpFromForwardedFor(xff);
  const real = headers.get("x-real-ip");
  if (real) return real.trim() || null;
  return null;
}

export function isLocalHostUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function isAccountBanned(userId: string) {
  const now = new Date();
  const ban = await prisma.accountBan.findFirst({
    where: {
      userId,
      revokedAt: null,
      OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
    },
    select: { id: true, bannedUntil: true, reason: true },
  });
  return ban;
}

export async function isIpBanned(ip: string) {
  const now = new Date();
  const bans = await prisma.ipBan.findMany({
    where: {
      revokedAt: null,
      OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
    },
    select: { ip: true, bannedUntil: true, reason: true },
    take: 500,
  });
  for (const b of bans) {
    const rule = (b.ip ?? "").trim();
    if (!rule) continue;
    if (rule.endsWith("*")) {
      const prefix = rule.slice(0, -1);
      if (ip.startsWith(prefix)) return b;
    } else {
      if (ip === rule) return b;
    }
  }
  return null;
}

