import { NextResponse } from "next/server";
import { purgeRejectedPhotos } from "@/lib/rejected-retention";

export const runtime = "nodejs";

function allowed(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get("token") ?? "").trim();
  const expected = (process.env.CRON_TOKEN ?? "").trim();
  if (!expected) return false;
  return token && token === expected;
}

export async function POST(request: Request) {
  if (!allowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { days?: number; limit?: number };
  const r = await purgeRejectedPhotos({ days: body.days, limit: body.limit });
  return NextResponse.json({ ok: true, ...r });
}

export async function GET(request: Request) {
  // allow GET for easy cron curl
  if (!allowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "");
  const limit = Number(searchParams.get("limit") ?? "");
  const r = await purgeRejectedPhotos({
    days: Number.isFinite(days) ? days : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  return NextResponse.json({ ok: true, ...r });
}

