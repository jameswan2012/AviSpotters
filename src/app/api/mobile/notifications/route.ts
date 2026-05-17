import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { listUserNotificationsByEmail } from "@/lib/user-notifications";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const rawFilter = String(searchParams.get("filter") ?? "all");
  const filter = rawFilter === "review" || rawFilter === "security" || rawFilter === "system" ? rawFilter : "all";
  const unreadOnly = String(searchParams.get("unreadOnly") ?? "") === "1";
  const payload = await listUserNotificationsByEmail(user.email, { filter, unreadOnly });
  return NextResponse.json(payload);
}

