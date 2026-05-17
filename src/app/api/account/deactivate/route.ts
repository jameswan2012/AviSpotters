import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { clearSessionCookie } from "@/lib/auth";
import { consumeGrant } from "@/lib/email-verify";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { verifyGrantId?: string };
  try {
    await consumeGrant({
      grantId: String(body.verifyGrantId ?? ""),
      purpose: "deactivate",
      userId: user.id,
      email: user.email,
    });
  } catch {
    return NextResponse.json({ error: "email_verify_required" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date() },
  });

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

