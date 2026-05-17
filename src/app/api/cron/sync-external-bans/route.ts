import { NextResponse } from "next/server";
import { syncPermanentBansToExternal } from "@/lib/external-ban";

export const runtime = "nodejs";

function allowed(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get("token") ?? "").trim();
  const headerKey = (request.headers.get("x-api-key") ?? "").trim();
  const expected = (process.env.CRON_TOKEN ?? "").trim();
  const banApiKey = (process.env.BAN_API_KEY ?? "").trim();
  if (expected && token && token === expected) return true;
  if (banApiKey && (headerKey === banApiKey || token === banApiKey)) return true;
  return false;
}

export async function GET(request: Request) {
  if (!allowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const result = await syncPermanentBansToExternal({ force: true, limit: 1000 });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!allowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { force?: boolean; limit?: number };
  const result = await syncPermanentBansToExternal({
    force: body.force === true,
    limit: Number.isFinite(Number(body.limit)) ? Number(body.limit) : undefined,
  });
  return NextResponse.json(result);
}

