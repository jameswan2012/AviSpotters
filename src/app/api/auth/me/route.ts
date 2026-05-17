import { NextResponse } from "next/server";
import { clearSessionCookieOnResponse, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAccountBanned } from "@/lib/ban";
import { getModerationConfig } from "@/lib/moderation";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, points: true, roleId: true, lastCheckInAt: true, priorityPasses: true },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const ban = await isAccountBanned(user.id);
    if (ban) {
      const moderation = await getModerationConfig();
      const isAutoModerationLock = String(ban.reason ?? "").startsWith("high_sensitive_words:");
      const response = NextResponse.json(
        {
          user: null,
          blocked: true,
          email: user.email,
          bannedUntil: ban.bannedUntil ? ban.bannedUntil.toISOString() : null,
          permanent: !ban.bannedUntil,
          message: isAutoModerationLock
            ? moderation.highLockMessage
            : ban.bannedUntil
              ? `This account is banned until ${ban.bannedUntil.toISOString()}`
              : "This account is banned.",
        },
        { status: 200 }
      );
      clearSessionCookieOnResponse(response, request);
      return response;
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("Auth me error:", e);
    // Avoid bubbling infra errors to 5xx/502 for auth polling.
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
