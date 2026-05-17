import { NextResponse } from "next/server";
import path from "path";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { uploadsRoot, writeFileEnsured } from "@/lib/uploads";
import { assertMagicMatchesAllowed, scanWithClamAVIfEnabled } from "@/lib/upload-security";
import { setSiteBrandLogo } from "@/lib/site-settings";

export const runtime = "nodejs";

function extFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/jpeg") return "jpg";
  return "";
}

export async function POST(request: Request) {
  const { user } = await requireSuperAdmin();
  const { searchParams } = new URL(request.url);
  const variantRaw = (searchParams.get("variant") ?? "dark").toLowerCase();
  const variant = variantRaw === "light" ? "light" : "dark";
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  const mime = (file.type || "").toLowerCase();
  const ext = extFromMime(mime);
  if (!ext) return NextResponse.json({ error: "只接受 JPG/PNG" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Logo 最大 2MB" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    assertMagicMatchesAllowed(bytes, ext === "png" ? ["png"] : ["jpeg"]);
    await scanWithClamAVIfEnabled(bytes, file.name || `logo.${ext}`);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("unsafe_upload_type")) return NextResponse.json({ error: "檔案格式不安全或不符合" }, { status: 400 });
    if (msg === "unsafe_upload_virus_found") return NextResponse.json({ error: "安全掃描：檔案疑似含惡意內容，已拒絕上傳" }, { status: 400 });
    if (msg === "unsafe_upload_scan_unavailable") return NextResponse.json({ error: "安全掃描暫不可用，請稍後再試" }, { status: 503 });
    return NextResponse.json({ error: "上傳檔案安全檢查失敗" }, { status: 400 });
  }

  const rel = path.posix.join("site", `logo-${variant}.${ext}`);
  const abs = path.join(uploadsRoot(), rel);
  await writeFileEnsured(abs, bytes);

  const now = new Date();
  await setSiteBrandLogo({
    patch:
      variant === "light"
        ? { logoLightPath: abs, logoLightMime: mime, logoLightSizeBytes: file.size, logoLightUpdatedAt: now.toISOString() }
        : { logoDarkPath: abs, logoDarkMime: mime, logoDarkSizeBytes: file.size, logoDarkUpdatedAt: now.toISOString() },
    updatedById: user.id,
  });
  return NextResponse.json({
    ok: true,
    variant,
    logoUrl: `/api/site/logo?variant=${encodeURIComponent(variant)}&v=${now.getTime()}`,
  });
}

export async function DELETE(request: Request) {
  const { user } = await requireSuperAdmin();
  const { searchParams } = new URL(request.url);
  const variantRaw = (searchParams.get("variant") ?? "").toLowerCase();
  const variant = variantRaw === "light" ? "light" : variantRaw === "dark" ? "dark" : "all";
  const patch =
    variant === "dark"
      ? { logoDarkPath: null, logoDarkMime: null, logoDarkSizeBytes: null, logoDarkUpdatedAt: null }
      : variant === "light"
        ? { logoLightPath: null, logoLightMime: null, logoLightSizeBytes: null, logoLightUpdatedAt: null }
        : {
            logoDarkPath: null,
            logoDarkMime: null,
            logoDarkSizeBytes: null,
            logoDarkUpdatedAt: null,
            logoLightPath: null,
            logoLightMime: null,
            logoLightSizeBytes: null,
            logoLightUpdatedAt: null,
            // legacy
            logoPath: null,
            logoMime: null,
            logoSizeBytes: null,
            logoUpdatedAt: null,
          };
  await setSiteBrandLogo({ patch, updatedById: user.id });
  return NextResponse.json({ ok: true, cleared: variant });
}

