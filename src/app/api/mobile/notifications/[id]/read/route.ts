import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { markUserNotificationReadByTicketId } from "@/lib/user-notifications";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const key = String(id || "");
  if (!key.startsWith("ticket:")) return NextResponse.json({ ok: true });
  const ticketId = key.slice("ticket:".length);
  await markUserNotificationReadByTicketId(ticketId, user.email);
  return NextResponse.json({ ok: true });
}

