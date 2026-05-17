import path from "node:path";
import { readFile } from "node:fs/promises";
import { uploadsRoot } from "@/lib/uploads";
import sharp from "sharp";

const AI_REVIEW_RESULT_PREFIX = "aiReviewResult:";

export const AI_CHECK_KEYS = [
  "halo",
  "color_quality",
  "compression",
  "composition",
  "dust_spots",
  "brightness",
  "crop_issue",
  "overprocessing",
  "undersharpen",
  "contrast",
  "exposure",
  "highlight_clip",
  "backlight",
  "vignette",
  "haze",
  "too_blurry",
  "out_of_focus",
  "horizon_tilt",
  "shooting_angle",
  "subject_too_small",
  "duplicate_upload",
  "missing_serial_number",
  "model_missing_suffix",
  "model_missing_manufacturer",
  "image_not_compliant",
  "illegal_image",
] as const;

export type AiCheckKey = (typeof AI_CHECK_KEYS)[number];

export type AiPhotoReviewResult = {
  version: 1;
  summary: string;
  fatalError: string | null;
  checks: Array<{
    key: AiCheckKey;
    label: string;
    hasIssue: boolean;
    count: number;
    severity: "low" | "medium" | "high";
    detail: string;
  }>;
  cropDirection: string | null;
  claimedTagChecks: Array<{
    tag: string;
    matched: boolean;
    confidence: number;
    detail: string;
  }>;
  mismatchHints: string[];
  rawText: string;
};

export function aiReviewResultKey(photoId: string) {
  return `${AI_REVIEW_RESULT_PREFIX}${photoId}`;
}

function toDataUrl(mime: string, buf: Buffer) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function loadOriginalImageDataUrl(params: { originalPath: string; originalMime: string }) {
  const abs = path.join(uploadsRoot(), params.originalPath);
  const raw = await readFile(abs);
  const mime = params.originalMime || "image/jpeg";
  try {
    // Reduce payload size for gateway compatibility and lower timeout risk.
    const optimized = await sharp(raw)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    return toDataUrl("image/jpeg", optimized);
  } catch {
    return toDataUrl(mime, raw);
  }
}

function extractJson(text: string) {
  const src = String(text || "").trim();
  const fence = src.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1] ?? src;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first >= 0 && last > first) return candidate.slice(first, last + 1);
  return candidate;
}

function cleanBool(v: unknown) {
  return v === true;
}

function cleanNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cleanSeverity(v: unknown): "low" | "medium" | "high" {
  return v === "high" || v === "medium" || v === "low" ? v : "low";
}

function cleanText(v: unknown, fallback = "") {
  return typeof v === "string" ? v.trim() : fallback;
}

const CHECK_LABELS: Record<AiCheckKey, string> = {
  halo: "光晕",
  color_quality: "颜色不佳",
  compression: "压缩问题",
  composition: "构图问题",
  dust_spots: "脏点",
  brightness: "亮度不佳",
  crop_issue: "裁切问题",
  overprocessing: "过度处理",
  undersharpen: "锐化过少",
  contrast: "对比度不适宜",
  exposure: "曝光不佳",
  highlight_clip: "高光溢出",
  backlight: "逆光",
  vignette: "暗角",
  haze: "薄雾",
  too_blurry: "太模糊",
  out_of_focus: "虚焦",
  horizon_tilt: "水平偏斜",
  shooting_angle: "拍摄角度不佳",
  subject_too_small: "主体过小",
  duplicate_upload: "重复上传",
  missing_serial_number: "缺失序列号",
  model_missing_suffix: "机型无后缀",
  model_missing_manufacturer: "机型未标注 Airbus/Boeing/COMAC",
  image_not_compliant: "图片不符合要求",
  illegal_image: "非法图片",
};

export function normalizeAiPhotoReview(rawText: string): AiPhotoReviewResult {
  const parsed = (() => {
    try {
      return JSON.parse(extractJson(rawText));
    } catch {
      return null;
    }
  })() as any;

  if (!parsed || typeof parsed !== "object") {
    return {
      version: 1,
      summary: "机器人分析返回格式无法解析。",
      fatalError: "invalid_response_format",
      checks: AI_CHECK_KEYS.map((key) => ({
        key,
        label: CHECK_LABELS[key],
        hasIssue: false,
        count: 0,
        severity: "low",
        detail: "",
      })),
      cropDirection: null,
      claimedTagChecks: [],
      mismatchHints: [],
      rawText,
    };
  }

  const checksObj = parsed?.checks && typeof parsed.checks === "object" ? parsed.checks : {};
  const checks = AI_CHECK_KEYS.map((key) => {
    const c = checksObj[key] ?? {};
    return {
      key,
      label: CHECK_LABELS[key],
      hasIssue: cleanBool(c?.hasIssue),
      count: Math.max(0, Math.round(cleanNum(c?.count, 0))),
      severity: cleanSeverity(c?.severity),
      detail: cleanText(c?.detail, ""),
    };
  });

  const tagChecks: Array<{ tag: string; matched: boolean; confidence: number; detail: string }> = Array.isArray(parsed?.claimedTagChecks)
    ? parsed.claimedTagChecks.map((t: any) => ({
        tag: cleanText(t?.tag, ""),
        matched: cleanBool(t?.matched),
        confidence: Math.max(0, Math.min(1, cleanNum(t?.confidence, 0))),
        detail: cleanText(t?.detail, ""),
      }))
    : [];

  return {
    version: 1,
    summary: cleanText(parsed?.summary, "机器人已完成分析。"),
    fatalError: cleanText(parsed?.fatalError || null, "") || null,
    checks,
    cropDirection: cleanText(parsed?.cropDirection || null, "") || null,
    claimedTagChecks: tagChecks.filter((t) => t.tag),
    mismatchHints: Array.isArray(parsed?.mismatchHints) ? parsed.mismatchHints.map((x: unknown) => cleanText(x, "")).filter(Boolean) : [],
    rawText,
  };
}

export function buildAiReviewPrompt(input: {
  photoId: string;
  registration: string;
  airline: string;
  aircraftModel: string;
  shotAirport: string;
  shotAt: string;
  title?: string | null;
  description?: string | null;
  serialNumber?: string | null;
  msn?: string | null;
  categories: string[];
}) {
  return [
    "你是一个航空图片审核机器人，请严格按 JSON 输出，不要输出任何 markdown。",
    "请根据图片和元信息判断问题是否存在，并尽量给出数量（count）。",
    "你必须返回以下格式：",
    JSON.stringify(
      {
        summary: "string",
        fatalError: "string|null",
        cropDirection: "left|right|top|bottom|center|null",
        checks: {
          halo: { hasIssue: false, count: 0, severity: "low", detail: "" },
          color_quality: { hasIssue: false, count: 0, severity: "low", detail: "" },
          compression: { hasIssue: false, count: 0, severity: "low", detail: "" },
          composition: { hasIssue: false, count: 0, severity: "low", detail: "" },
          dust_spots: { hasIssue: false, count: 0, severity: "low", detail: "" },
          brightness: { hasIssue: false, count: 0, severity: "low", detail: "" },
          crop_issue: { hasIssue: false, count: 0, severity: "low", detail: "" },
          overprocessing: { hasIssue: false, count: 0, severity: "low", detail: "" },
          undersharpen: { hasIssue: false, count: 0, severity: "low", detail: "" },
          contrast: { hasIssue: false, count: 0, severity: "low", detail: "" },
          exposure: { hasIssue: false, count: 0, severity: "low", detail: "" },
          highlight_clip: { hasIssue: false, count: 0, severity: "low", detail: "" },
          backlight: { hasIssue: false, count: 0, severity: "low", detail: "" },
          vignette: { hasIssue: false, count: 0, severity: "low", detail: "" },
          haze: { hasIssue: false, count: 0, severity: "low", detail: "" },
          too_blurry: { hasIssue: false, count: 0, severity: "low", detail: "" },
          out_of_focus: { hasIssue: false, count: 0, severity: "low", detail: "" },
          horizon_tilt: { hasIssue: false, count: 0, severity: "low", detail: "" },
          shooting_angle: { hasIssue: false, count: 0, severity: "low", detail: "" },
          subject_too_small: { hasIssue: false, count: 0, severity: "low", detail: "" },
          duplicate_upload: { hasIssue: false, count: 0, severity: "low", detail: "" },
          missing_serial_number: { hasIssue: false, count: 0, severity: "low", detail: "" },
          model_missing_suffix: { hasIssue: false, count: 0, severity: "low", detail: "" },
          model_missing_manufacturer: { hasIssue: false, count: 0, severity: "low", detail: "" },
          image_not_compliant: { hasIssue: false, count: 0, severity: "low", detail: "" },
          illegal_image: { hasIssue: false, count: 0, severity: "low", detail: "" },
        },
        claimedTagChecks: [{ tag: "string", matched: true, confidence: 0.0, detail: "string" }],
        mismatchHints: ["string"],
      },
      null,
      2
    ),
    "标签匹配规则：如果用户声明了下列标签，请你识别图中是否匹配并写入 claimedTagChecks：",
    "机场, 客舱, 驾驶舱, 夜拍, 机翼视角, 航展, 直升机, 公务机, 专机, 通用航空, 战斗机。",
    "元信息如下：",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
