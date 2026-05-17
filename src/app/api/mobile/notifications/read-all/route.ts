import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { markAllUserNotificationsReadByEmail } from "@/lib/user-notifications";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await markAllUserNotificationsReadByEmail(user.email);
  return NextResponse.json({ ok: true });
}

