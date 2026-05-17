import { NextResponse } from "next/server";
import { clearLocalMails, listLocalMails } from "@/lib/local-mailbox";

function isAllowed() {
  return process.env.LOCAL_MAIL_MODE === "1" || process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!isAllowed()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "100");
  const items = await listLocalMails(Number.isFinite(limit) ? limit : 100);
  return NextResponse.json({ ok: true, items });
}

export async function DELETE() {
  if (!isAllowed()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await clearLocalMails();
  return NextResponse.json({ ok: true });
}

