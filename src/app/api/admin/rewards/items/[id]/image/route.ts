import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { uploadsRoot, writeFileEnsured } from "@/lib/uploads";
import { assertMagicMatchesAllowed, scanWithClamAVIfEnabled } from "@/lib/upload-security";

export const runtime = "nodejs";

function extFromMime(mime: string) {
  const value = mime.toLowerCase();
  if (value === "image/png") return "png";
  if (value === "image/jpeg") return "jpg";
  return "";
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { roleId } = await requireAdmin();
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  const mime = (file.type || "").toLowerCase();
  const ext = extFromMime(mime);
  if (!ext) return NextResponse.json({ error: "只接受 JPG/PNG" }, { status: 400 });
  if (file.size > 1024 * 1024) return NextResponse.json({ error: "圖片最大 1MB" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    assertMagicMatchesAllowed(bytes, ext === "png" ? ["png"] : ["jpeg"]);
    await scanWithClamAVIfEnabled(bytes, file.name || `reward-item.${ext}`);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("unsafe_upload_type")) return NextResponse.json({ error: "檔案格式不安全或不符合" }, { status: 400 });
    if (msg === "unsafe_upload_virus_found") return NextResponse.json({ error: "安全掃描：檔案疑似含惡意內容，已拒絕上傳" }, { status: 400 });
    if (msg === "unsafe_upload_scan_unavailable") return NextResponse.json({ error: "安全掃描暫不可用，請稍後再試" }, { status: 503 });
    return NextResponse.json({ error: "上傳檔案安全檢查失敗" }, { status: 400 });
  }

  const rel = path.posix.join("rewards", id, `cover.${ext}`);
  const abs = path.join(uploadsRoot(), rel);
  await writeFileEnsured(abs, bytes);

  const now = new Date();
  await prisma.rewardItem.update({
    where: { id },
    data: { imagePath: abs, imageMime: mime, imageSizeBytes: file.size, imageUpdatedAt: now },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, imageUrl: `/api/rewards/items/${encodeURIComponent(id)}/image?v=${now.getTime()}` });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { roleId } = await requireAdmin();
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.rewardItem.update({
    where: { id },
    data: { imagePath: null, imageMime: null, imageSizeBytes: null, imageUpdatedAt: null },
    select: { id: true },
  });
  return NextResponse.json({ ok: true });
}
