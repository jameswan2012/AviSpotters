import { NextResponse } from "next/server";
import { runModerationScan } from "@/lib/moderation-scan";

export const runtime = "nodejs";

function allowed(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get("token") ?? "").trim();
  const expected = (process.env.CRON_TOKEN ?? "").trim();
  if (!expected) return false;
  return token && token === expected;
}

export async function GET(request: Request) {
  if (!allowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "");
  const result = await runModerationScan({ source: "cron_get", limit: Number.isFinite(limit) ? limit : undefined });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  if (!allowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { limit?: number };
  const result = await runModerationScan({ source: "cron_post", limit: body.limit });
  return NextResponse.json({ ok: true, ...result });
}

