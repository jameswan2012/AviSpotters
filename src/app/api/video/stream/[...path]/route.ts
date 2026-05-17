import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { uploadsRoot } from "@/lib/uploads";

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function resolveExistingPath(relPath: string) {
  const safeRel = relPath.replace(/^\/+/, "").replace(/\.\./g, "");
  const candidates = [
    path.join(uploadsRoot(), "videos", safeRel),
    path.join(uploadsRoot(), safeRel),
    path.join(process.cwd(), "public", "uploads", "videos", safeRel),
    path.join(process.cwd(), "public", "uploads", safeRel),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return { filePath: candidate, stat };
    } catch {
    }
  }
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: rawParts } = await params;
  const relPath = (rawParts || []).join("/");
  if (!relPath) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const resolved = await resolveExistingPath(relPath);
  if (!resolved) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const range = request.headers.get("range");
  const mime = contentTypeFor(resolved.filePath);
  const total = resolved.stat.size;

  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }

    const start = Number(match[1]);
    const requestedEnd = match[2] ? Number(match[2]) : total - 1;
    const end = Math.min(requestedEnd, total - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }

    const handle = await fs.open(resolved.filePath, "r");
    try {
      const length = end - start + 1;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Type": mime,
          "Content-Length": String(length),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } finally {
      await handle.close();
    }
  }

  const bytes = await fs.readFile(resolved.filePath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
