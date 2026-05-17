import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp, isAccountBanned, isIpBanned } from "@/lib/ban";
import { checkExternalBanAndAutoUnban } from "@/lib/external-ban";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    if (ip) {
      const ipBan = await isIpBanned(ip);
      if (ipBan) {
        return NextResponse.json({
          blocked: true,
          type: "ip",
          ip,
          bannedUntil: ipBan.bannedUntil ? ipBan.bannedUntil.toISOString() : null,
          permanent: !ipBan.bannedUntil,
          clearSession: true,
        });
      }
    }

    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ blocked: false });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, phone: true },
    });
    if (!user) return NextResponse.json({ blocked: false, clearSession: true });

    const externalBan = await checkExternalBanAndAutoUnban({
      username: user.name,
      phone: user.phone,
      email: user.email,
    });
    if (externalBan.blocked) {
      return NextResponse.json({
        blocked: true,
        type: "account",
        email: user.email,
        bannedUntil: externalBan.expiresAt || null,
        permanent: !externalBan.expiresAt,
        clearSession: true,
      });
    }

    const accountBan = await isAccountBanned(user.id);
    if (accountBan) {
      return NextResponse.json({
        blocked: true,
        type: "account",
        email: user.email,
        bannedUntil: accountBan.bannedUntil ? accountBan.bannedUntil.toISOString() : null,
        permanent: !accountBan.bannedUntil,
        clearSession: true,
      });
    }

    return NextResponse.json({ blocked: false });
  } catch {
    return NextResponse.json({ blocked: false });
  }
}

