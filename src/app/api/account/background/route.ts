import { NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { uploadsRoot, writeFileEnsured } from "@/lib/uploads";
import { assertMagicMatchesAllowed, scanWithClamAVIfEnabled } from "@/lib/upload-security";

export const runtime = "nodejs";

function extFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/jpeg") return "jpg";
  if (m === "image/gif") return "gif";
  return "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  const mime = (file.type || "").toLowerCase();
  const ext = extFromMime(mime);
  if (!ext) return NextResponse.json({ error: "只接受 JPG/PNG；高級管理員可用 GIF" }, { status: 400 });
  if (ext === "gif" && roleId < 4) return NextResponse.json({ error: "只接受 JPG/PNG" }, { status: 403 });

  const maxBytes = ext === "gif" ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: ext === "gif" ? "GIF 最大 15MB" : "背景最大 5MB" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    assertMagicMatchesAllowed(bytes, ext === "png" ? ["png"] : ext === "gif" ? ["gif"] : ["jpeg"]);
    await scanWithClamAVIfEnabled(bytes, file.name || `background.${ext}`);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("unsafe_upload_type")) return NextResponse.json({ error: "檔案格式不安全或不符合" }, { status: 400 });
    if (msg === "unsafe_upload_virus_found") return NextResponse.json({ error: "安全掃描：檔案疑似含惡意內容，已拒絕上傳" }, { status: 400 });
    if (msg === "unsafe_upload_scan_unavailable") return NextResponse.json({ error: "安全掃描暫不可用，請稍後再試" }, { status: 503 });
    return NextResponse.json({ error: "上傳檔案安全檢查失敗" }, { status: 400 });
  }
  const rel = path.posix.join("users", user.id, `background.${ext}`);
  const abs = path.join(uploadsRoot(), rel);
  await writeFileEnsured(abs, bytes);

  const now = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      backgroundPath: abs,
      backgroundMime: mime,
      backgroundSizeBytes: file.size,
      backgroundUpdatedAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, backgroundUrl: `/api/users/${encodeURIComponent(user.id)}/background?v=${now.getTime()}` });
}

