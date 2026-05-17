import path from "node:path";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { uploadsRoot, fileExists } from "@/lib/uploads";

export const runtime = "nodejs";

function mimeFromExt(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

async function resolveLogoPath(variant: "light" | "dark") {
  const candidates =
    variant === "light"
      ? ["site/logo-light.png", "site/logo-light.jpg", "site/logo-dark.png", "site/logo-dark.jpg"]
      : ["site/logo-dark.png", "site/logo-dark.jpg", "site/logo-light.png", "site/logo-light.jpg"];

  for (const rel of candidates) {
    const abs = path.join(uploadsRoot(), rel);
    if (await fileExists(abs)) return abs;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variant = (searchParams.get("variant") ?? "dark").toLowerCase() === "light" ? "light" : "dark";
  const abs = await resolveLogoPath(variant);
  if (!abs) return NextResponse.json({ error: "logo not found" }, { status: 404 });

  let fileStat;
  try {
    fileStat = await stat(abs);
  } catch {
    return NextResponse.json({ error: "logo missing" }, { status: 404 });
  }

  const stream = createReadStream(abs);
  return new Response(Readable.toWeb(stream) as any, {
    headers: {
      "content-type": mimeFromExt(abs),
      "content-length": String(fileStat.size),
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
