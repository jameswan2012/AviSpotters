import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { consumeGrant } from "@/lib/email-verify";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string; newPassword?: string; verifyGrantId?: string };
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "password_too_short" }, { status: 400 });

  try {
    await consumeGrant({
      grantId: String(body.verifyGrantId ?? ""),
      purpose: "change_password",
      userId: user.id,
      email: user.email,
    });
  } catch {
    return NextResponse.json({ error: "email_verify_required" }, { status: 409 });
  }

  const db = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ok = await verifyPassword(currentPassword, db.passwordHash);
  if (!ok) return NextResponse.json({ error: "password_wrong" }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash }, select: { id: true } });
  return NextResponse.json({ ok: true });
}

