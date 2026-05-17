import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { SITE_FOOTER_KEY } from "@/lib/site-settings";

export const runtime = "nodejs";

export async function GET() {
  const row = await (prisma as any).siteSetting.findUnique({ where: { key: SITE_FOOTER_KEY } });
  let parsed: any = {};
  try {
    parsed = row?.valueJson ? (JSON.parse(row.valueJson) as any) : {};
  } catch {
    parsed = {};
  }
  const p = typeof parsed?.groupQrPath === "string" ? String(parsed.groupQrPath) : "";
  const mime = typeof parsed?.groupQrMime === "string" ? String(parsed.groupQrMime) : "";
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  const buf = await fs.readFile(p);
  return new Response(buf, {
    headers: {
      "content-type": mime || "application/octet-stream",
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

