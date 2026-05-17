import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import * as exifr from "exifr";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uploadsRoot, writeFileEnsured } from "@/lib/uploads";
import { assertMagicMatchesAllowed, scanWithClamAVIfEnabled } from "@/lib/upload-security";
import { notifyStaffReviewers } from "@/lib/user-notifications";

export const runtime = "nodejs";

function getText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function detectImageKind(bytes: Uint8Array): "jpeg" | "png" {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  throw new Error("不支援的圖片格式");
}

function normalizeReplyLocale(value: string) {
  return value === "en" || value === "zh-Hans" ? value : "zh-Hant";
}

function parseCategories(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/,|，|、|\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    )
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      uploadDisabled: true,
      priorityPasses: true,
    },
  });
  if (!user) return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  if (user.uploadDisabled) return NextResponse.json({ error: "你的上傳功能目前已被停用" }, { status: 403 });

  const formData = await request.formData();
  const registration = getText(formData.get("registration")).toUpperCase();
  const shotAirport = getText(formData.get("shotAirport"));
  const aircraftModel = getText(formData.get("aircraftModel"));
  const airline = getText(formData.get("airline"));
  const shotAt = getText(formData.get("shotAt"));
  const title = getText(formData.get("title")) || null;
  const msn = getText(formData.get("msn")) || null;
  const serialNumber = getText(formData.get("serialNumber")) || null;
  const description = getText(formData.get("description")) || null;
  const uploaderMessage = getText(formData.get("uploaderMessage")) || null;
  const replyLocale = normalizeReplyLocale(getText(formData.get("replyLocale")));
  const categories = parseCategories(getText(formData.get("categories")));
  const clientUploadId = getText(formData.get("clientUploadId")) || null;
  const usePriority = getText(formData.get("usePriority")) === "1";
  const ccAgree = getText(formData.get("ccAgree")) === "1" || getText(formData.get("ccAgree")).toLowerCase() === "on";
  const file = formData.get("image");

  if (!registration || !shotAirport || !aircraftModel || !airline || !shotAt) {
    return NextResponse.json({ error: "請完整填寫必填欄位" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shotAt)) {
    return NextResponse.json({ error: "拍攝日期格式不正確" }, { status: 400 });
  }
  if (!ccAgree) {
    return NextResponse.json({ error: "請先勾選授權確認" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "請選擇要上傳的圖片" }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "圖片不可超過 50MB" }, { status: 400 });
  }

  if (clientUploadId) {
    const existing = await prisma.photo.findFirst({
      where: { userId: user.id, clientUploadId },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, photoId: existing.id, duplicate: true });
  }

  const pendingCount = await prisma.photo.count({ where: { userId: user.id, status: "pending" } });
  if (pendingCount >= 5) {
    return NextResponse.json({ error: "上傳佇列已滿（同時最多 5 張待審）" }, { status: 429 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    assertMagicMatchesAllowed(bytes, ["jpeg", "png"]);
    await scanWithClamAVIfEnabled(bytes, file.name || "photo-upload");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "檔案驗證失敗" },
      { status: 400 }
    );
  }

  let kind: "jpeg" | "png";
  try {
    kind = detectImageKind(bytes);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "不支援的圖片格式" },
      { status: 400 }
    );
  }

  const photoId = randomUUID();
  const dirRel = path.posix.join("photos", photoId);
  const originalRel = path.posix.join(dirRel, kind === "jpeg" ? "original.jpg" : "original.png");
  const displayRel = path.posix.join(dirRel, "display.jpg");
  const thumbRel = path.posix.join(dirRel, "thumb.jpg");

  let image = sharp(bytes, { failOn: "warning" }).rotate();
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    return NextResponse.json({ error: "圖片無法解析" }, { status: 400 });
  }

  const displayBuffer = await image
    .clone()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  const thumbBuffer = await image
    .clone()
    .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();

  let exifJson: string | null = null;
  let exifSummaryJson: string | null = null;
  try {
    const exif = await exifr.parse(Buffer.from(bytes), {
      tiff: true,
      exif: true,
      gps: false,
      xmp: false,
      icc: false,
      iptc: false,
    });
    if (exif) {
      exifJson = JSON.stringify(exif);
      exifSummaryJson = JSON.stringify({
        camera: [exif.Make, exif.Model].filter(Boolean).join(" ").trim() || null,
        lens: exif.LensModel || null,
        iso: exif.ISO || null,
        focalLength: exif.FocalLength || null,
        fNumber: exif.FNumber || null,
        exposureTime: exif.ExposureTime || null,
      });
    }
  } catch {
    exifJson = null;
    exifSummaryJson = null;
  }

  await writeFileEnsured(path.join(uploadsRoot(), originalRel), bytes);
  await writeFileEnsured(path.join(uploadsRoot(), displayRel), displayBuffer);
  await writeFileEnsured(path.join(uploadsRoot(), thumbRel), thumbBuffer);

  const created = await prisma.$transaction(async (tx) => {
    if (usePriority) {
      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: { priorityPasses: true },
      });
      if (!current || current.priorityPasses <= 0) {
        throw new Error("目前沒有可用的優先佇列次數");
      }
      await tx.user.update({
        where: { id: user.id },
        data: { priorityPasses: { decrement: 1 } },
      });
    }

    return tx.photo.create({
      data: {
        id: photoId,
        userId: user.id,
        status: "pending",
        priority: usePriority ? 1 : 0,
        registration,
        shotAirport,
        aircraftModel,
        airline,
        shotAt,
        ccAgree: true,
        categoriesJson: categories.length ? JSON.stringify(categories) : null,
        title,
        msn,
        serialNumber,
        description,
        uploaderMessage,
        replyLocale,
        originalPath: originalRel,
        displayPath: displayRel,
        thumbPath: thumbRel,
        originalMime: kind === "jpeg" ? "image/jpeg" : "image/png",
        displayMime: "image/jpeg",
        fileName: file.name || null,
        fileSizeBytes: file.size,
        width: metadata?.width ?? null,
        height: metadata?.height ?? null,
        clientUploadId,
        exifJson,
        exifSummaryJson,
      },
      select: { id: true },
    });
  });

  await notifyStaffReviewers({
    title: "有新照片待審",
    body: `${user.name || user.email} 提交了新的照片作品。`,
    type: "photo_queue_new",
    meta: { photoId: created.id, registration, airline, aircraftModel },
    excludeUserId: user.id,
  }).catch(() => {});

  return NextResponse.json({ ok: true, photoId: created.id });
}
