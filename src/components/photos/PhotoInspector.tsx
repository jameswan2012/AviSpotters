"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Hist = { luma: Uint32Array; r: Uint32Array; g: Uint32Array; b: Uint32Array };
type SmartAssessment = {
  width: number;
  height: number;
  meanLuma: number;
  contrastStd: number;
  highlightClipPct: number;
  shadowClipPct: number;
  saturationMean: number;
  sharpness: number;
  noise: number;
  dustCandidates: number;
  suggestions: Array<{ level: "warn" | "info"; key: string }>;
};
type DustMark = { id: string; x: number; y: number; r: number };
type RobotCheck = {
  key: string;
  label: string;
  hasIssue: boolean;
  count: number;
  severity: "low" | "medium" | "high";
  detail: string;
};
type RobotAnalysisPayload = {
  source: string;
  model: string;
  analyzedAt: string;
  analyzedById: string;
  photoId: string;
  result: {
    summary: string;
    fatalError: string | null;
    checks: RobotCheck[];
    cropDirection: string | null;
    claimedTagChecks: Array<{ tag: string; matched: boolean; confidence: number; detail: string }>;
    mismatchHints: string[];
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function drawHistogram(canvas: HTMLCanvasElement, h: Uint32Array, color: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const hh = canvas.height;
  ctx.clearRect(0, 0, w, hh);
  const max = h.reduce((m, v) => (v > m ? v : m), 1);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, w, hh);
  ctx.fillStyle = color;
  for (let x = 0; x < 256; x++) {
    const v = h[x] ?? 0;
    const barH = Math.round((v / max) * (hh - 2));
    ctx.fillRect(x, hh - barH, 1, barH);
  }
}

async function computeHistFromImage(img: HTMLImageElement): Promise<Hist> {
  const w0 = img.naturalWidth || 0;
  const h0 = img.naturalHeight || 0;
  if (!w0 || !h0) throw new Error("bad image");
  const maxSide = 1400;
  const ratio = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * ratio));
  const h = Math.max(1, Math.round(h0 * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const luma = new Uint32Array(256);
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const rr = data[i] ?? 0;
    const gg = data[i + 1] ?? 0;
    const bb = data[i + 2] ?? 0;
    r[rr] += 1;
    g[gg] += 1;
    b[bb] += 1;
    const y = Math.round(0.2126 * rr + 0.7152 * gg + 0.0722 * bb);
    luma[y] += 1;
  }
  return { luma, r, g, b };
}

async function loadImageForAnalysis(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = url;
  });
  return img;
}

async function renderCfdDataUrl(
  img: HTMLImageElement,
  opts?: {
    gain?: number; // amplify factor
    radius?: number; // blur radius (box)
    context?: number; // 0..0.9, blend original back for easier locating
  }
) {
  // CFD visualization for quick artifact check (called "Check for dusk" in UI).
  const w0 = img.naturalWidth || 0;
  const h0 = img.naturalHeight || 0;
  if (!w0 || !h0) throw new Error("bad image");
  const maxSide = 1800;
  const ratio = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * ratio));
  const h = Math.max(1, Math.round(h0 * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;

  // grayscale
  const gray = new Uint8ClampedArray(w * h);
  const chroma = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const rr = d[i] ?? 0;
    const gg = d[i + 1] ?? 0;
    const bb = d[i + 2] ?? 0;
    gray[p] = Math.round(0.2126 * rr + 0.7152 * gg + 0.0722 * bb);
    const mx = Math.max(rr, gg, bb);
    const mn = Math.min(rr, gg, bb);
    chroma[p] = mx - mn;
  }

  // blur (box blur approximate by 1D passes)
  const tmp = new Uint16Array(w * h);
  const out = new Uint8ClampedArray(w * h);
  const rad = clamp(Math.round(Number(opts?.radius ?? 2)), 1, 5);
  const gain = clamp(Number(opts?.gain ?? 12), 2, 30);
  const context = clamp(Number(opts?.context ?? 0), 0, 0.9);

  function hsvToRgb(h: number, s: number, v: number) {
    const hh = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = v - c;
    let r1 = 0,
      g1 = 0,
      b1 = 0;
    if (hh < 60) [r1, g1, b1] = [c, x, 0];
    else if (hh < 120) [r1, g1, b1] = [x, c, 0];
    else if (hh < 180) [r1, g1, b1] = [0, c, x];
    else if (hh < 240) [r1, g1, b1] = [0, x, c];
    else if (hh < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
  }

  function heatColor(t01: number) {
    const t = clamp(t01, 0, 1);
    // Blue (240) -> Red (0)
    const h = (1 - t) * 240;
    const v = 0.15 + 0.85 * Math.pow(t, 0.75); // boost mid/high
    const { r, g, b } = hsvToRgb(h, 1, v);
    // keep near-zero dark gray instead of pure black
    if (t < 0.03) return { r: 18, g: 18, b: 18 };
    return { r, g, b };
  }

  // horizontal
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -rad; x <= rad; x++) sum += gray[y * w + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum;
      const xRemove = x - rad;
      const xAdd = x + rad + 1;
      sum += gray[y * w + clamp(xAdd, 0, w - 1)] - gray[y * w + clamp(xRemove, 0, w - 1)];
    }
  }
  // vertical + high-pass magnitude
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -rad; y <= rad; y++) sum += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      const blur = sum / ((rad * 2 + 1) * (rad * 2 + 1));
      const g0 = gray[y * w + x] ?? 0;
      const high = g0 - blur;
      // amplify small defects, keep magnitude (0..255)
      const v = clamp(Math.round(Math.abs(high) * gain), 0, 255);
      out[y * w + x] = v;
      const yRemove = y - rad;
      const yAdd = y + rad + 1;
      sum += tmp[clamp(yAdd, 0, h - 1) * w + x] - tmp[clamp(yRemove, 0, h - 1) * w + x];
    }
  }

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const t = (out[p] ?? 0) / 255;
    const c = heatColor(t);
    if (context > 0) {
      const rr = d[i] ?? 0;
      const gg = d[i + 1] ?? 0;
      const bb = d[i + 2] ?? 0;
      const k = context;
      d[i] = Math.round(rr * k + c.r * (1 - k));
      d[i + 1] = Math.round(gg * k + c.g * (1 - k));
      d[i + 2] = Math.round(bb * k + c.b * (1 - k));
    } else {
      d[i] = c.r;
      d[i + 1] = c.g;
      d[i + 2] = c.b;
    }
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function renderEdgesDataUrl(img: HTMLImageElement) {
  const w0 = img.naturalWidth || 0;
  const h0 = img.naturalHeight || 0;
  if (!w0 || !h0) throw new Error("bad image");
  const maxSide = 1800;
  const ratio = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * ratio));
  const h = Math.max(1, Math.round(h0 * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;

  const gray = new Uint8ClampedArray(w * h);
  const chroma = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const rr = d[i] ?? 0;
    const gg = d[i + 1] ?? 0;
    const bb = d[i + 2] ?? 0;
    gray[p] = Math.round(0.2126 * rr + 0.7152 * gg + 0.0722 * bb);
    const mx = Math.max(rr, gg, bb);
    const mn = Math.min(rr, gg, bb);
    chroma[p] = mx - mn;
  }

  // Sobel edge magnitude
  const out = new Uint8ClampedArray(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p00 = gray[(y - 1) * w + (x - 1)] ?? 0;
      const p01 = gray[(y - 1) * w + x] ?? 0;
      const p02 = gray[(y - 1) * w + (x + 1)] ?? 0;
      const p10 = gray[y * w + (x - 1)] ?? 0;
      const p12 = gray[y * w + (x + 1)] ?? 0;
      const p20 = gray[(y + 1) * w + (x - 1)] ?? 0;
      const p21 = gray[(y + 1) * w + x] ?? 0;
      const p22 = gray[(y + 1) * w + (x + 1)] ?? 0;

      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;
      const mag = Math.sqrt(gx * gx + gy * gy);
      const v = clamp(Math.round(mag * 0.9), 0, 255);
      out[y * w + x] = v;
    }
  }

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = out[p] ?? 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function renderHaloDataUrl(
  img: HTMLImageElement,
  opts?: {
    gain?: number;
    radius?: number;
    threshold?: number;
    context?: number;
    contour?: boolean;
  }
) {
  const w0 = img.naturalWidth || 0;
  const h0 = img.naturalHeight || 0;
  if (!w0 || !h0) throw new Error("bad image");
  const maxSide = 1800;
  const ratio = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * ratio));
  const h = Math.max(1, Math.round(h0 * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;

  const gray = new Uint8ClampedArray(w * h);
  const chroma = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const rr = d[i] ?? 0;
    const gg = d[i + 1] ?? 0;
    const bb = d[i + 2] ?? 0;
    gray[p] = Math.round(0.2126 * rr + 0.7152 * gg + 0.0722 * bb);
    const mx = Math.max(rr, gg, bb);
    const mn = Math.min(rr, gg, bb);
    chroma[p] = mx - mn;
  }

  const rad = clamp(Math.round(Number(opts?.radius ?? 3)), 1, 8);
  const gain = clamp(Number(opts?.gain ?? 18), 1, 50);
  const threshold = clamp(Number(opts?.threshold ?? 6), 0, 64);
  const context = clamp(Number(opts?.context ?? 0.05), 0, 0.9);
  const contour = opts?.contour === true;

  const tmp = new Uint16Array(w * h);
  const blur = new Uint8ClampedArray(w * h);

  // horizontal blur
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -rad; x <= rad; x++) sum += gray[y * w + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum;
      const xRemove = x - rad;
      const xAdd = x + rad + 1;
      sum += gray[y * w + clamp(xAdd, 0, w - 1)] - gray[y * w + clamp(xRemove, 0, w - 1)];
    }
  }
  // vertical blur
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -rad; y <= rad; y++) sum += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      blur[y * w + x] = Math.round(sum / ((rad * 2 + 1) * (rad * 2 + 1)));
      const yRemove = y - rad;
      const yAdd = y + rad + 1;
      sum += tmp[clamp(yAdd, 0, h - 1) * w + x] - tmp[clamp(yRemove, 0, h - 1) * w + x];
    }
  }

  // Edge map (Sobel) to avoid missing halos around high-contrast boundaries.
  const edge = new Uint8ClampedArray(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p00 = gray[(y - 1) * w + (x - 1)] ?? 0;
      const p01 = gray[(y - 1) * w + x] ?? 0;
      const p02 = gray[(y - 1) * w + (x + 1)] ?? 0;
      const p10 = gray[y * w + (x - 1)] ?? 0;
      const p12 = gray[y * w + (x + 1)] ?? 0;
      const p20 = gray[(y + 1) * w + (x - 1)] ?? 0;
      const p21 = gray[(y + 1) * w + x] ?? 0;
      const p22 = gray[(y + 1) * w + (x + 1)] ?? 0;
      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;
      const mag = Math.sqrt(gx * gx + gy * gy);
      edge[y * w + x] = clamp(Math.round(mag * 0.8), 0, 255);
    }
  }

  // Halo score: combine local overshoot with edge strength.
  // Bright halos -> warm (red/yellow), dark halos -> cool (cyan/blue).
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g0 = gray[p] ?? 0;
    const gb = blur[p] ?? 0;
    const delta = g0 - gb;
    const brightHalo = Math.max(0, delta - threshold);
    const darkHalo = Math.max(0, -delta - threshold);
    const edgeFactor = clamp(((edge[p] ?? 0) - 10) / 70, 0, 1);
    const haloRaw = brightHalo + darkHalo;
    const score = clamp(Math.round(haloRaw * gain * (0.35 + edgeFactor * 1.2)), 0, 255);
    const t = score / 255;

    // Increase mid-range visibility aggressively.
    const tBoost = Math.pow(t, 0.55);
    const br = clamp(Math.round(brightHalo * gain * (0.4 + edgeFactor)), 0, 255) / 255;
    const dr = clamp(Math.round(darkHalo * gain * (0.4 + edgeFactor)), 0, 255) / 255;

    // Base dark background + warm/cool overlays.
    const base = 8;
    const warmR = Math.round(255 * Math.pow(br, 0.72));
    const warmG = Math.round(210 * Math.pow(br, 0.95));
    const warmB = Math.round(40 * Math.pow(br, 1.35));
    const coolR = Math.round(25 * Math.pow(dr, 1.4));
    const coolG = Math.round(190 * Math.pow(dr, 0.9));
    const coolB = Math.round(255 * Math.pow(dr, 0.72));

    let hr = clamp(base + warmR + coolR + Math.round(35 * tBoost), 0, 255);
    let hg = clamp(base + warmG + coolG + Math.round(20 * tBoost), 0, 255);
    let hb = clamp(base + warmB + coolB + Math.round(15 * tBoost), 0, 255);

    if (contour) {
      // Binary-like contour emphasis for quick pass/fail scan.
      const edgeOn = score >= 36;
      hr = edgeOn ? 255 : 10;
      hg = edgeOn ? 50 : 10;
      hb = edgeOn ? 50 : 10;
    }

    if (context > 0) {
      const rr = d[i] ?? 0;
      const gg = d[i + 1] ?? 0;
      const bb = d[i + 2] ?? 0;
      d[i] = Math.round(rr * context + hr * (1 - context));
      d[i + 1] = Math.round(gg * context + hg * (1 - context));
      d[i + 2] = Math.round(bb * context + hb * (1 - context));
    } else {
      d[i] = hr;
      d[i + 1] = hg;
      d[i + 2] = hb;
    }
    d[i + 3] = 255;
  }

  ctx.putImageData(id, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function renderDustDataUrl(
  img: HTMLImageElement,
  opts?: {
    gain?: number;
    radius?: number;
    threshold?: number;
    minArea?: number;
    maxArea?: number;
    context?: number;
  }
): Promise<{ dataUrl: string; marks: DustMark[] }> {
  const w0 = img.naturalWidth || 0;
  const h0 = img.naturalHeight || 0;
  if (!w0 || !h0) throw new Error("bad image");
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * ratio));
  const h = Math.max(1, Math.round(h0 * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;

  const gray = new Uint8ClampedArray(w * h);
  const chroma = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const rr = d[i] ?? 0;
    const gg = d[i + 1] ?? 0;
    const bb = d[i + 2] ?? 0;
    gray[p] = Math.round(0.2126 * rr + 0.7152 * gg + 0.0722 * bb);
    const mx = Math.max(rr, gg, bb);
    const mn = Math.min(rr, gg, bb);
    chroma[p] = mx - mn;
  }

  const rad = clamp(Math.round(Number(opts?.radius ?? 6)), 2, 16);
  const gain = clamp(Number(opts?.gain ?? 14), 1, 50);
  const threshold = clamp(Number(opts?.threshold ?? 8), 0, 80);
  const minArea = clamp(Math.round(Number(opts?.minArea ?? 3)), 1, 200);
  const maxArea = clamp(Math.round(Number(opts?.maxArea ?? 180)), 10, 5000);
  const context = clamp(Number(opts?.context ?? 0.6), 0, 1);

  const tmp = new Uint32Array(w * h);
  const blur = new Uint8ClampedArray(w * h);
  const grad = computeGradientMap(gray, w, h);

  // Box blur (horizontal)
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -rad; x <= rad; x++) sum += gray[y * w + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum;
      const xRemove = x - rad;
      const xAdd = x + rad + 1;
      sum += gray[y * w + clamp(xAdd, 0, w - 1)] - gray[y * w + clamp(xRemove, 0, w - 1)];
    }
  }
  // Box blur (vertical)
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -rad; y <= rad; y++) sum += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      blur[y * w + x] = Math.round(sum / ((rad * 2 + 1) * (rad * 2 + 1)));
      const yRemove = y - rad;
      const yAdd = y + rad + 1;
      sum += tmp[clamp(yAdd, 0, h - 1) * w + x] - tmp[clamp(yRemove, 0, h - 1) * w + x];
    }
  }

  // Dark residual map (dust usually dark, soft-edged spots).
  const mask = new Uint8Array(w * h);
  const darkResidual = new Uint8ClampedArray(w * h);
  const minScore = Math.max(8, Math.round(12 + threshold * 0.45));
  for (let p = 0; p < gray.length; p++) {
    const g0 = gray[p] ?? 0;
    const gb = blur[p] ?? 0;
    const dark = Math.max(0, gb - g0 - threshold);
    darkResidual[p] = clamp(Math.round(dark), 0, 255);
    const smooth = (grad[p] ?? 0) <= 40;
    const brightBg = gb >= 44;
    const lowChroma = (chroma[p] ?? 0) <= 52;
    // Limit to smooth bright low-color regions to avoid aircraft body/details.
    mask[p] = dark * gain >= minScore && smooth && brightBg && lowChroma ? 1 : 0;
  }

  // Connected components to find candidate dust blobs.
  const visited = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  const marks: Array<{ cx: number; cy: number; r: number }> = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx0 = y * w + x;
      if (!mask[idx0] || visited[idx0]) continue;

      let head = 0;
      let tail = 0;
      qx[tail] = x;
      qy[tail] = y;
      tail++;
      visited[idx0] = 1;

      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;
      let sumGrad = 0;
      let sumBg = 0;
      let sumChroma = 0;
      let sumDark = 0;

      while (head < tail) {
        const cx = qx[head]!;
        const cy = qy[head]!;
        head++;
        area++;
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const ci = cy * w + cx;
        sumGrad += grad[ci] ?? 0;
        sumBg += blur[ci] ?? 0;
        sumChroma += chroma[ci] ?? 0;
        sumDark += darkResidual[ci] ?? 0;

        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
          const ni = ny * w + nx;
          if (!mask[ni] || visited[ni]) continue;
          visited[ni] = 1;
          qx[tail] = nx;
          qy[tail] = ny;
          tail++;
        }
      }

      if (area < minArea || area > maxArea) continue;
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const ratioBox = bw > bh ? bw / Math.max(1, bh) : bh / Math.max(1, bw);
      if (ratioBox > 3.2) continue; // too elongated for dust spot
      const meanGrad = sumGrad / Math.max(1, area);
      const meanBg = sumBg / Math.max(1, area);
      const meanChroma = sumChroma / Math.max(1, area);
      const meanDark = sumDark / Math.max(1, area);
      if (meanGrad > 34) continue;
      if (meanBg < 44) continue;
      if (meanChroma > 48) continue;
      if (meanDark < 1.6) continue;
      // Reject "hard-edge round details" (e.g. aircraft screws/rivets):
      // dust spots are usually soft blobs with weak annulus gradient.
      const ccx = sumX / Math.max(1, area);
      const ccy = sumY / Math.max(1, area);
      const req = Math.sqrt(area / Math.PI);
      const ringIn = Math.max(1.1, req * 0.85);
      const ringOut = Math.max(ringIn + 0.8, req * 1.95);
      let ringN = 0;
      let ringGradAcc = 0;
      let ringHard = 0;
      const rx0 = clamp(Math.floor(ccx - ringOut - 1), 0, w - 1);
      const rx1 = clamp(Math.ceil(ccx + ringOut + 1), 0, w - 1);
      const ry0 = clamp(Math.floor(ccy - ringOut - 1), 0, h - 1);
      const ry1 = clamp(Math.ceil(ccy + ringOut + 1), 0, h - 1);
      for (let yy = ry0; yy <= ry1; yy++) {
        for (let xx = rx0; xx <= rx1; xx++) {
          const dist = Math.hypot(xx - ccx, yy - ccy);
          if (dist < ringIn || dist > ringOut) continue;
          const gv = grad[yy * w + xx] ?? 0;
          ringN++;
          ringGradAcc += gv;
          if (gv >= 58) ringHard++;
        }
      }
      if (ringN > 0) {
        const ringGradMean = ringGradAcc / ringN;
        const ringHardRatio = ringHard / ringN;
        if (ringGradMean > 32 || ringHardRatio > 0.22) continue;
      }
      let region = 0;
      let edgeHit = 0;
      const exMinX = clamp(minX - 2, 0, w - 1);
      const exMaxX = clamp(maxX + 2, 0, w - 1);
      const exMinY = clamp(minY - 2, 0, h - 1);
      const exMaxY = clamp(maxY + 2, 0, h - 1);
      for (let yy = exMinY; yy <= exMaxY; yy++) {
        for (let xx = exMinX; xx <= exMaxX; xx++) {
          region++;
          if ((grad[yy * w + xx] ?? 0) >= 62) edgeHit++;
        }
      }
      if (region > 0 && edgeHit / region > 0.3) continue;

      const cx = sumX / area;
      const cy = sumY / area;
      const r = clamp(Math.round(Math.sqrt(area / Math.PI) + 2), 3, 24);
      marks.push({ cx, cy, r });
    }
  }

  // Render: dimmed context + red circles on candidates.
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round((d[i] ?? 0) * context);
    d[i + 1] = Math.round((d[i + 1] ?? 0) * context);
    d[i + 2] = Math.round((d[i + 2] ?? 0) * context);
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  ctx.lineWidth = 2;
  for (const m of marks) {
    ctx.strokeStyle = "rgba(255,64,64,0.95)";
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,210,210,0.85)";
    ctx.beginPath();
    ctx.arc(m.cx, m.cy, Math.max(2, m.r - 2), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Dust candidates: ${marks.length}`, 12, 22);
  const mappedMarks: DustMark[] = marks.map((m, idx) => ({
    id: `d-${idx}-${Math.round(m.cx)}-${Math.round(m.cy)}-${Math.round(m.r)}`,
    x: m.cx,
    y: m.cy,
    r: m.r,
  }));
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), marks: mappedMarks };
}

function boxBlurGray(gray: Uint8ClampedArray, w: number, h: number, rad: number) {
  const tmp = new Uint32Array(w * h);
  const out = new Uint8ClampedArray(w * h);
  const r = clamp(Math.round(rad), 1, 24);

  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += gray[y * w + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum;
      const xRemove = x - r;
      const xAdd = x + r + 1;
      sum += gray[y * w + clamp(xAdd, 0, w - 1)] - gray[y * w + clamp(xRemove, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(sum / ((r * 2 + 1) * (r * 2 + 1)));
      const yRemove = y - r;
      const yAdd = y + r + 1;
      sum += tmp[clamp(yAdd, 0, h - 1) * w + x] - tmp[clamp(yRemove, 0, h - 1) * w + x];
    }
  }
  return out;
}

function computeGradientMap(gray: Uint8ClampedArray, w: number, h: number) {
  const grad = new Uint16Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const l = gray[y * w + (x - 1)] ?? 0;
      const r = gray[y * w + (x + 1)] ?? 0;
      const u = gray[(y - 1) * w + x] ?? 0;
      const d = gray[(y + 1) * w + x] ?? 0;
      grad[y * w + x] = Math.abs(l - r) + Math.abs(u - d);
    }
  }
  return grad;
}

function countDustCandidatesFromGray(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  opts: { radius: number; threshold: number; gain: number; minArea: number; maxArea: number }
) {
  const blur = boxBlurGray(gray, w, h, opts.radius);
  const grad = computeGradientMap(gray, w, h);
  const mask = new Uint8Array(w * h);
  const darkResidual = new Uint8ClampedArray(w * h);
  const minScore = Math.max(8, Math.round(12 + opts.threshold * 0.45));
  for (let p = 0; p < gray.length; p++) {
    const dark = Math.max(0, (blur[p] ?? 0) - (gray[p] ?? 0) - opts.threshold);
    darkResidual[p] = clamp(Math.round(dark), 0, 255);
    const smooth = (grad[p] ?? 0) <= 40;
    const brightBg = (blur[p] ?? 0) >= 44;
    mask[p] = dark * opts.gain >= minScore && smooth && brightBg ? 1 : 0;
  }
  const visited = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx0 = y * w + x;
      if (!mask[idx0] || visited[idx0]) continue;
      let head = 0;
      let tail = 0;
      qx[tail] = x;
      qy[tail] = y;
      tail++;
      visited[idx0] = 1;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumGrad = 0;
      let sumBg = 0;
      let sumDark = 0;
      while (head < tail) {
        const cx = qx[head]!;
        const cy = qy[head]!;
        head++;
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const ci = cy * w + cx;
        sumGrad += grad[ci] ?? 0;
        sumBg += blur[ci] ?? 0;
        sumDark += darkResidual[ci] ?? 0;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
          const ni = ny * w + nx;
          if (!mask[ni] || visited[ni]) continue;
          visited[ni] = 1;
          qx[tail] = nx;
          qy[tail] = ny;
          tail++;
        }
      }
      if (area < opts.minArea || area > opts.maxArea) continue;
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const ratioBox = bw > bh ? bw / Math.max(1, bh) : bh / Math.max(1, bw);
      if (ratioBox > 3.2) continue;
      const meanGrad = sumGrad / Math.max(1, area);
      const meanBg = sumBg / Math.max(1, area);
      const meanDark = sumDark / Math.max(1, area);
      if (meanGrad > 34) continue;
      if (meanBg < 44) continue;
      if (meanDark < 1.6) continue;
      const ccx = (minX + maxX) / 2;
      const ccy = (minY + maxY) / 2;
      const req = Math.sqrt(area / Math.PI);
      const ringIn = Math.max(1.1, req * 0.85);
      const ringOut = Math.max(ringIn + 0.8, req * 1.95);
      let ringN = 0;
      let ringGradAcc = 0;
      let ringHard = 0;
      const rx0 = clamp(Math.floor(ccx - ringOut - 1), 0, w - 1);
      const rx1 = clamp(Math.ceil(ccx + ringOut + 1), 0, w - 1);
      const ry0 = clamp(Math.floor(ccy - ringOut - 1), 0, h - 1);
      const ry1 = clamp(Math.ceil(ccy + ringOut + 1), 0, h - 1);
      for (let yy = ry0; yy <= ry1; yy++) {
        for (let xx = rx0; xx <= rx1; xx++) {
          const dist = Math.hypot(xx - ccx, yy - ccy);
          if (dist < ringIn || dist > ringOut) continue;
          const gv = grad[yy * w + xx] ?? 0;
          ringN++;
          ringGradAcc += gv;
          if (gv >= 58) ringHard++;
        }
      }
      if (ringN > 0) {
        const ringGradMean = ringGradAcc / ringN;
        const ringHardRatio = ringHard / ringN;
        if (ringGradMean > 32 || ringHardRatio > 0.22) continue;
      }
      let region = 0;
      let edgeHit = 0;
      const exMinX = clamp(minX - 2, 0, w - 1);
      const exMaxX = clamp(maxX + 2, 0, w - 1);
      const exMinY = clamp(minY - 2, 0, h - 1);
      const exMaxY = clamp(maxY + 2, 0, h - 1);
      for (let yy = exMinY; yy <= exMaxY; yy++) {
        for (let xx = exMinX; xx <= exMaxX; xx++) {
          region++;
          if ((grad[yy * w + xx] ?? 0) >= 62) edgeHit++;
        }
      }
      if (region > 0 && edgeHit / region > 0.3) continue;
      count++;
    }
  }
  return count;
}

async function computeSmartAssessment(img: HTMLImageElement): Promise<SmartAssessment> {
  const w0 = img.naturalWidth || 0;
  const h0 = img.naturalHeight || 0;
  if (!w0 || !h0) throw new Error("bad image");
  const maxSide = 1400;
  const ratio = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * ratio));
  const h = Math.max(1, Math.round(h0 * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let n = 0;
  let mean = 0;
  let m2 = 0;
  let hi = 0;
  let lo = 0;
  let satSum = 0;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const rr = data[i] ?? 0;
    const gg = data[i + 1] ?? 0;
    const bb = data[i + 2] ?? 0;
    const y = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
    gray[p] = Math.round(y);
    n++;
    const delta = y - mean;
    mean += delta / n;
    m2 += delta * (y - mean);
    if (y >= 250) hi++;
    if (y <= 5) lo++;
    const mx = Math.max(rr, gg, bb);
    const mn = Math.min(rr, gg, bb);
    satSum += mx - mn;
  }
  const variance = n > 1 ? m2 / (n - 1) : 0;
  const std = Math.sqrt(Math.max(0, variance));

  // Simple Laplacian-based sharpness and residual noise estimate.
  let lapMean = 0;
  let lapM2 = 0;
  let lapN = 0;
  let noiseAcc = 0;
  let noiseN = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = gray[y * w + x] ?? 0;
      const l = gray[y * w + (x - 1)] ?? 0;
      const r = gray[y * w + (x + 1)] ?? 0;
      const u = gray[(y - 1) * w + x] ?? 0;
      const d = gray[(y + 1) * w + x] ?? 0;
      const lap = -4 * c + l + r + u + d;
      lapN++;
      const v = Math.abs(lap);
      const delta = v - lapMean;
      lapMean += delta / lapN;
      lapM2 += delta * (v - lapMean);

      const grad = Math.abs(l - r) + Math.abs(u - d);
      if (grad < 20) {
        const local = (l + r + u + d) / 4;
        noiseAcc += Math.abs(c - local);
        noiseN++;
      }
    }
  }
  const sharpness = lapN > 1 ? Math.sqrt(Math.max(0, lapM2 / (lapN - 1))) : 0;
  const noise = noiseN > 0 ? noiseAcc / noiseN : 0;
  const dustCandidates = countDustCandidatesFromGray(gray, w, h, {
    radius: 7,
    threshold: 5,
    gain: 18,
    minArea: 2,
    maxArea: 240,
  });

  const suggestions: Array<{ level: "warn" | "info"; key: string }> = [];
  const hiPct = n > 0 ? hi / n : 0;
  const loPct = n > 0 ? lo / n : 0;
  const satMean = n > 0 ? satSum / n : 0;
  if (mean < 70) suggestions.push({ level: "warn", key: "under_exposed" });
  if (mean > 185) suggestions.push({ level: "warn", key: "over_exposed" });
  if (hiPct > 0.02) suggestions.push({ level: "warn", key: "highlight_clip" });
  if (loPct > 0.04) suggestions.push({ level: "warn", key: "shadow_clip" });
  if (std < 38) suggestions.push({ level: "info", key: "low_contrast" });
  if (sharpness < 16) suggestions.push({ level: "warn", key: "soft_focus" });
  if (sharpness > 95) suggestions.push({ level: "info", key: "oversharpen_risk" });
  if (noise > 10) suggestions.push({ level: "info", key: "noise_visible" });
  if (satMean < 22) suggestions.push({ level: "info", key: "low_saturation" });
  if (dustCandidates > 0) suggestions.push({ level: "warn", key: "dust_detected" });
  if (!suggestions.length) suggestions.push({ level: "info", key: "overall_ok" });

  return {
    width: w0,
    height: h0,
    meanLuma: mean,
    contrastStd: std,
    highlightClipPct: hiPct * 100,
    shadowClipPct: loPct * 100,
    saturationMean: satMean,
    sharpness,
    noise,
    dustCandidates,
    suggestions,
  };
}

export function PhotoInspector({
  imageUrl,
  photoId,
  showSmartAssessment = false,
  aiTrainingEnabled = false,
  canUseRobotReview = false,
  robotReviewBlockedReason = null,
}: {
  imageUrl: string;
  photoId: string;
  showSmartAssessment?: boolean;
  aiTrainingEnabled?: boolean;
  canUseRobotReview?: boolean;
  robotReviewBlockedReason?: string | null;
}) {
  const locale = useClientLocale();
  const [mode, setMode] = useState<"normal" | "cfd" | "edges" | "halo" | "dust">("normal");
  const [showGrid, setShowGrid] = useState(false);
  const [showCenter, setShowCenter] = useState(false);
  const [showHorizon, setShowHorizon] = useState(false);
  const [horizonDeg, setHorizonDeg] = useState(0);
  const [showMagnify, setShowMagnify] = useState(false);
  const [magnifyXy, setMagnifyXy] = useState<{ x: number; y: number } | null>(null);
  const [hist, setHist] = useState<Hist | null>(null);
  const [showHist, setShowHist] = useState(false);
  const [showRgbHist, setShowRgbHist] = useState(false);
  const [cfdUrl, setCfdUrl] = useState<string | null>(null);
  const [loadingCfd, setLoadingCfd] = useState(false);
  const [cfdGain, setCfdGain] = useState(30);
  const [cfdRadius, setCfdRadius] = useState(2);
  const [cfdContext, setCfdContext] = useState(0);
  const cfdKey = `${cfdGain}:${cfdRadius}:${cfdContext}`;
  const cfdKeyRef = useRef<string>("");
  const [edgesUrl, setEdgesUrl] = useState<string | null>(null);
  const [loadingEdges, setLoadingEdges] = useState(false);
  const [haloUrl, setHaloUrl] = useState<string | null>(null);
  const [loadingHalo, setLoadingHalo] = useState(false);
  const [haloGain, setHaloGain] = useState(24);
  const [haloRadius, setHaloRadius] = useState(2);
  const [haloThreshold, setHaloThreshold] = useState(3);
  const [haloContext, setHaloContext] = useState(0.12);
  const [haloContour, setHaloContour] = useState(false);
  const haloKey = `${haloGain}:${haloRadius}:${haloThreshold}:${haloContext}:${haloContour ? 1 : 0}`;
  const haloKeyRef = useRef<string>("");
  const [dustUrl, setDustUrl] = useState<string | null>(null);
  const [loadingDust, setLoadingDust] = useState(false);
  const [dustGain, setDustGain] = useState(18);
  const [dustRadius, setDustRadius] = useState(7);
  const [dustThreshold, setDustThreshold] = useState(5);
  const [dustMinArea, setDustMinArea] = useState(2);
  const [dustMaxArea, setDustMaxArea] = useState(240);
  const [dustContext, setDustContext] = useState(0.6);
  const dustKey = `${dustGain}:${dustRadius}:${dustThreshold}:${dustMinArea}:${dustMaxArea}:${dustContext}`;
  const dustKeyRef = useRef<string>("");
  const [dustMarks, setDustMarks] = useState<DustMark[]>([]);
  const [dismissedDustIds, setDismissedDustIds] = useState<Record<string, true>>({});
  const [manualDustMarks, setManualDustMarks] = useState<DustMark[]>([]);
  const [manualDustRadius, setManualDustRadius] = useState(14);
  const [markDustMode, setMarkDustMode] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [smart, setSmart] = useState<SmartAssessment | null>(null);
  const [loadingSmart, setLoadingSmart] = useState(false);
  const [robotResult, setRobotResult] = useState<RobotAnalysisPayload | null>(null);
  const [loadingRobot, setLoadingRobot] = useState(false);
  const [robotErr, setRobotErr] = useState<string | null>(null);
  const [imageReadError, setImageReadError] = useState<string | null>(null);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const analysisImageRef = useRef<HTMLImageElement | null>(null);
  const analysisImageUrlRef = useRef<string>("");
  const analysisImagePromiseRef = useRef<Promise<HTMLImageElement> | null>(null);
  const cfdCacheRef = useRef<Map<string, string>>(new Map());
  const edgesCacheRef = useRef<Map<string, string>>(new Map());
  const haloCacheRef = useRef<Map<string, string>>(new Map());
  const dustCacheRef = useRef<Map<string, { dataUrl: string; marks: DustMark[] }>>(new Map());
  const histCacheRef = useRef<Map<string, Hist>>(new Map());
  const smartCacheRef = useRef<Map<string, SmartAssessment>>(new Map());

  const displayedUrl =
    mode === "cfd"
      ? (cfdUrl ?? imageUrl)
      : mode === "edges"
        ? (edgesUrl ?? imageUrl)
        : mode === "halo"
          ? (haloUrl ?? imageUrl)
          : mode === "dust"
            ? (dustUrl ?? imageUrl)
          : imageUrl;
  const renderScale = baseScale;

  useEffect(() => {
    setMode("normal");
    setCfdUrl(null);
    cfdKeyRef.current = "";
    setEdgesUrl(null);
    setHaloUrl(null);
    haloKeyRef.current = "";
    setDustUrl(null);
    dustKeyRef.current = "";
    setDustMarks([]);
    setDismissedDustIds({});
    setManualDustMarks([]);
    setMarkDustMode(false);
    setFeedbackMessage(null);
    setSmart(null);
    setLoadingSmart(false);
    setRobotResult(null);
    setLoadingRobot(false);
    setRobotErr(null);
    setImageReadError(null);
    setHist(null);
    setShowHist(false);
    setShowRgbHist(false);
    setBaseScale(1);
    setImgSize(null);
    analysisImageRef.current = null;
    analysisImageUrlRef.current = "";
    analysisImagePromiseRef.current = null;
  }, [imageUrl]);

  const getAnalysisImage = useCallback(async () => {
    if (analysisImageRef.current && analysisImageUrlRef.current === imageUrl) return analysisImageRef.current;
    if (analysisImagePromiseRef.current && analysisImageUrlRef.current === imageUrl) return analysisImagePromiseRef.current;
    analysisImageUrlRef.current = imageUrl;
    const promise = loadImageForAnalysis(imageUrl).then((img) => {
      analysisImageRef.current = img;
      return img;
    });
    analysisImagePromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      analysisImagePromiseRef.current = null;
    }
  }, [imageUrl]);

  useEffect(() => {
    void getAnalysisImage().catch(() => {
      // ignore preload failure
    });
  }, [getAnalysisImage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT" || (e.target as HTMLElement | null)?.tagName === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") {
        const el = boxRef.current;
        if (!el) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else el.requestFullscreen().catch(() => {});
      }
      if (e.key === "0") resetView();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    function recalc() {
      const el = boxRef.current;
      const img = imgRef.current;
      if (!el || !img) return;
      const rect = el.getBoundingClientRect();
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (!rect.width || !rect.height || !w || !h) return;
      const s = Math.min(rect.width / w, rect.height / h);
      setBaseScale(s);
      setImgSize({ w, h });
    }

    recalc();
    const ro = new ResizeObserver(() => recalc());
    const el2 = boxRef.current;
    if (el2) ro.observe(el2);
    return () => ro.disconnect();
  }, [displayedUrl]);

  async function ensureCfd() {
    if (loadingCfd) return;
    if (cfdUrl && cfdKeyRef.current === cfdKey) return;
    try {
      setLoadingCfd(true);
      const cacheKey = `${imageUrl}|${cfdKey}`;
      const cached = cfdCacheRef.current.get(cacheKey);
      if (cached) {
        setCfdUrl(cached);
        cfdKeyRef.current = cfdKey;
        return;
      }
      // Always compute from original image URL (not current rendered mode),
      // so "enhance" stays stable even when currently viewing edge mode.
      const analysisImg = await getAnalysisImage();
      const url = await renderCfdDataUrl(analysisImg, { gain: cfdGain, radius: cfdRadius, context: cfdContext });
      cfdCacheRef.current.set(cacheKey, url);
      setCfdUrl(url);
      cfdKeyRef.current = cfdKey;
    } catch (e) {
      console.error("CFD enhance failed:", e);
    } finally {
      setLoadingCfd(false);
    }
  }

  async function ensureEdges() {
    if (edgesUrl || loadingEdges) return;
    try {
      setLoadingEdges(true);
      const cacheKey = imageUrl;
      const cached = edgesCacheRef.current.get(cacheKey);
      if (cached) {
        setEdgesUrl(cached);
        return;
      }
      // Keep edge rendering based on original image for deterministic output.
      const analysisImg = await getAnalysisImage();
      const url = await renderEdgesDataUrl(analysisImg);
      edgesCacheRef.current.set(cacheKey, url);
      setEdgesUrl(url);
    } catch (e) {
      console.error("Edge rendering failed:", e);
    } finally {
      setLoadingEdges(false);
    }
  }

  async function ensureHalo() {
    if (loadingHalo) return;
    if (haloUrl && haloKeyRef.current === haloKey) return;
    try {
      setLoadingHalo(true);
      const cacheKey = `${imageUrl}|${haloKey}`;
      const cached = haloCacheRef.current.get(cacheKey);
      if (cached) {
        setHaloUrl(cached);
        haloKeyRef.current = haloKey;
        return;
      }
      const analysisImg = await getAnalysisImage();
      const url = await renderHaloDataUrl(analysisImg, {
        gain: haloGain,
        radius: haloRadius,
        threshold: haloThreshold,
        context: haloContext,
        contour: haloContour,
      });
      haloCacheRef.current.set(cacheKey, url);
      setHaloUrl(url);
      haloKeyRef.current = haloKey;
    } catch (e) {
      console.error("Halo rendering failed:", e);
    } finally {
      setLoadingHalo(false);
    }
  }

  async function ensureDust() {
    if (loadingDust) return;
    if (dustUrl && dustKeyRef.current === dustKey) return;
    try {
      setLoadingDust(true);
      const cacheKey = `${imageUrl}|${dustKey}`;
      const cached = dustCacheRef.current.get(cacheKey);
      if (cached) {
        setDustUrl(cached.dataUrl);
        setDustMarks(cached.marks);
        setDismissedDustIds({});
        setManualDustMarks([]);
        dustKeyRef.current = dustKey;
        return;
      }
      const analysisImg = await getAnalysisImage();
      const out = await renderDustDataUrl(analysisImg, {
        gain: dustGain,
        radius: dustRadius,
        threshold: dustThreshold,
        minArea: dustMinArea,
        maxArea: dustMaxArea,
        context: dustContext,
      });
      dustCacheRef.current.set(cacheKey, out);
      setDustUrl(out.dataUrl);
      setDustMarks(out.marks);
      setDismissedDustIds({});
      setManualDustMarks([]);
      dustKeyRef.current = dustKey;
    } catch (e) {
      console.error("Dust rendering failed:", e);
    } finally {
      setLoadingDust(false);
    }
  }

  async function postAiFeedback(payload: {
    event: "dust_false_positive" | "dust_manual_positive" | "dust_all_false_positive" | "smart_suggestion_correct" | "smart_suggestion_wrong";
    marker?: { x: number; y: number; r: number; source: "detected" | "manual" };
    suggestionKey?: string;
    note?: string;
  }) {
    if (!aiTrainingEnabled) return;
    try {
      setFeedbackBusy(true);
      setFeedbackMessage(null);
      const res = await fetch("/api/admin/ai-training/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photoId,
          imageUrl,
          locale,
          ...payload,
        }),
      });
      if (!res.ok) throw new Error("feedback_failed");
      setFeedbackMessage(tr("已記錄 AI 回饋", "已记录 AI 反馈", "AI feedback recorded"));
    } catch {
      setFeedbackMessage(tr("AI 回饋上傳失敗", "AI 反馈上传失败", "Failed to upload AI feedback"));
    } finally {
      setFeedbackBusy(false);
    }
  }

  async function ensureSmart() {
    if (loadingSmart || smart) return;
    try {
      setLoadingSmart(true);
      const cacheKey = imageUrl;
      const cached = smartCacheRef.current.get(cacheKey);
      if (cached) {
        setSmart(cached);
        return;
      }
      const analysisImg = await getAnalysisImage();
      const out = await computeSmartAssessment(analysisImg);
      smartCacheRef.current.set(cacheKey, out);
      setSmart(out);
    } catch (e) {
      console.error("Smart assessment failed:", e);
    } finally {
      setLoadingSmart(false);
    }
  }

  async function loadRobotExisting() {
    if (!canUseRobotReview || loadingRobot || robotResult) return;
    try {
      setLoadingRobot(true);
      setRobotErr(null);
      const res = await fetch(`/api/admin/photos/${encodeURIComponent(photoId)}/ai-review`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) return;
      if (json?.exists && json?.result) setRobotResult(json.result as RobotAnalysisPayload);
    } finally {
      setLoadingRobot(false);
    }
  }

  async function runRobotReview() {
    if (!canUseRobotReview || loadingRobot) return;
    try {
      setLoadingRobot(true);
      setRobotErr(null);
      const res = await fetch(`/api/admin/photos/${encodeURIComponent(photoId)}/ai-review`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const msg = [String(json?.error || "robot_review_failed"), json?.detail ? String(json.detail) : ""].filter(Boolean).join(": ");
        throw new Error(msg);
      }
      if (json?.result) setRobotResult(json.result as RobotAnalysisPayload);
    } catch (e) {
      setRobotErr(e instanceof Error ? e.message : "robot_review_failed");
    } finally {
      setLoadingRobot(false);
    }
  }

  async function ensureHist() {
    if (hist) return;
    const targetUrl = imageUrl;
    if (!targetUrl) return;
    const cached = histCacheRef.current.get(targetUrl);
    if (cached) {
      setHist(cached);
      return;
    }
    // Always analyze original image URL (not enhanced/edge rendering),
    // otherwise RGB histogram can be polluted by visualization modes.
    const analysisImg = await getAnalysisImage();
    const h = await computeHistFromImage(analysisImg);
    histCacheRef.current.set(targetUrl, h);
    setHist(h);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (showMagnify && boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      setMagnifyXy({ x: clamp(e.clientX - rect.left, 0, rect.width), y: clamp(e.clientY - rect.top, 0, rect.height) });
    }
  }

  function resetView() {
    setShowGrid(false);
    setShowCenter(false);
    setShowHorizon(false);
    setHorizonDeg(0);
    setShowMagnify(false);
    setMagnifyXy(null);
    setMode("normal");
  }

  useEffect(() => {
    if (mode !== "cfd") return;
    void ensureCfd();
  }, [mode, cfdKey, imageUrl]);

  useEffect(() => {
    if (mode !== "halo") return;
    void ensureHalo();
  }, [mode, haloKey, haloContour, imageUrl]);

  useEffect(() => {
    if (mode !== "dust") return;
    void ensureDust();
  }, [mode, dustKey, imageUrl]);

  useEffect(() => {
    if (!canUseRobotReview) return;
    void loadRobotExisting();
  }, [canUseRobotReview, photoId]);

  function tr(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  function smartText(key: string) {
    switch (key) {
      case "under_exposed":
        return tr("整體偏暗，建議提高曝光或陰影。", "整体偏暗，建议提高曝光或阴影。", "Image appears underexposed; consider raising exposure or shadows.");
      case "over_exposed":
        return tr("整體偏亮，建議降低曝光或高光。", "整体偏亮，建议降低曝光或高光。", "Image appears overexposed; consider reducing exposure/highlights.");
      case "highlight_clip":
        return tr("高光可能溢出，建議回收高光細節。", "高光可能溢出，建议回收高光细节。", "Highlights may be clipped; recover highlight details.");
      case "shadow_clip":
        return tr("暗部壓死較多，建議適度提亮暗部。", "暗部压死较多，建议适度提亮暗部。", "Shadows may be crushed; consider lifting dark areas.");
      case "low_contrast":
        return tr("對比偏平，可微調對比或曲線。", "对比偏平，可微调对比或曲线。", "Contrast looks flat; adjust contrast/curves slightly.");
      case "soft_focus":
        return tr("清晰度偏低，可能虛焦或抖動。", "清晰度偏低，可能虚焦或抖动。", "Sharpness is low; possible soft focus or motion blur.");
      case "oversharpen_risk":
        return tr("銳化偏重風險，建議檢查光暈/邊緣。", "锐化偏重风险，建议检查光晕/边缘。", "Potential over-sharpening; check halos/edges.");
      case "noise_visible":
        return tr("噪點較明顯，建議適度降噪。", "噪点较明显，建议适度降噪。", "Visible noise detected; consider mild denoise.");
      case "low_saturation":
        return tr("飽和度偏低，可微調色彩。", "饱和度偏低，可微调色彩。", "Saturation appears low; slight color adjustment may help.");
      case "dust_detected":
        return tr("檢測到疑似髒點，建議使用「脏点」工具確認。", "检测到疑似脏点，建议使用「脏点」工具确认。", "Suspected dust spots detected; verify with the dust tool.");
      default:
        return tr("整體參數正常，未發現明顯風險。", "整体参数正常，未发现明显风险。", "Overall metrics look acceptable.");
    }
  }

  const visibleDustMarks = useMemo(() => dustMarks.filter((m) => !dismissedDustIds[m.id]), [dustMarks, dismissedDustIds]);

  async function markDetectedAsFalsePositive(mark: DustMark) {
    setDismissedDustIds((prev) => ({ ...prev, [mark.id]: true }));
    await postAiFeedback({
      event: "dust_false_positive",
      marker: { x: mark.x, y: mark.y, r: mark.r, source: "detected" },
    });
  }

  async function markAllDetectedAsFalse() {
    const current = [...visibleDustMarks];
    if (!current.length) return;
    const next: Record<string, true> = {};
    for (const mark of current) next[mark.id] = true;
    setDismissedDustIds((prev) => ({ ...prev, ...next }));
    await postAiFeedback({
      event: "dust_all_false_positive",
      note: `count=${current.length}`,
    });
  }

  function addManualDustMarkAt(clientX: number, clientY: number) {
    if (!markDustMode || mode !== "dust" || !imgSize || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const imgW = imgSize.w * renderScale;
    const imgH = imgSize.h * renderScale;
    const imgLeft = (rect.width - imgW) / 2;
    const imgTop = (rect.height - imgH) / 2;
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    if (localX < imgLeft || localX > imgLeft + imgW || localY < imgTop || localY > imgTop + imgH) return;
    const x = ((localX - imgLeft) / imgW) * imgSize.w;
    const y = ((localY - imgTop) / imgH) * imgSize.h;
    const mark: DustMark = {
      id: `m-${Date.now()}-${Math.round(x)}-${Math.round(y)}`,
      x: clamp(x, 0, imgSize.w),
      y: clamp(y, 0, imgSize.h),
      r: clamp(manualDustRadius, 3, 80),
    };
    setManualDustMarks((prev) => [...prev, mark]);
    void postAiFeedback({
      event: "dust_manual_positive",
      marker: { x: mark.x, y: mark.y, r: mark.r, source: "manual" },
    });
  }

  const gridStyle = useMemo(() => {
    if (!showGrid) return {};
    return {
      backgroundImage:
        "linear-gradient(to right, rgba(239,68,68,.85) 3px, transparent 3px), linear-gradient(to bottom, rgba(239,68,68,.85) 3px, transparent 3px)",
      backgroundSize: "33.333% 33.333%",
      backgroundPosition: "0 0",
    } as const;
  }, [showGrid]);

  const horizonStyle = useMemo(() => {
    if (!showHorizon) return {};
    return {
      transform: `rotate(${horizonDeg}deg)`,
      transformOrigin: "50% 50%",
    } as const;
  }, [showHorizon, horizonDeg]);

  const magnifyStyle = useMemo(() => {
    if (!showMagnify || !magnifyXy || !boxRef.current || !imgSize) return null;
    const rect = boxRef.current.getBoundingClientRect();
    const x0 = magnifyXy.x;
    const y0 = magnifyXy.y;
    const zoom = 3.5;
    const imgW = imgSize.w * renderScale;
    const imgH = imgSize.h * renderScale;
    const imgLeft = (rect.width - imgW) / 2;
    const imgTop = (rect.height - imgH) / 2;
    const x = clamp(x0 - imgLeft, 0, imgW);
    const y = clamp(y0 - imgTop, 0, imgH);
    return {
      left: x0,
      top: y0,
      width: 160,
      height: 160,
      marginLeft: -80,
      marginTop: -80,
      borderRadius: 9999,
      backgroundImage: `url(${displayedUrl})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${imgW * zoom}px ${imgH * zoom}px`,
      backgroundPosition: `${-x * zoom + 80}px ${-y * zoom + 80}px`,
      boxShadow: "0 12px 30px rgba(0,0,0,.35)",
      border: "1px solid rgba(255,255,255,.25)",
    } as const;
  }, [showMagnify, magnifyXy, displayedUrl, imgSize, renderScale]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("審圖工具", "审图工具", "Inspector")}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await ensureCfd();
              setMode((m) => (m === "cfd" ? "normal" : "cfd"));
            }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              mode === "cfd" 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {loadingCfd ? "🎨…" : "🎨 增强"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await ensureEdges();
              setMode((m) => (m === "edges" ? "normal" : "edges"));
            }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              mode === "edges" 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {loadingEdges ? tr("邊緣…", "边缘…", "Edges…") : "📐 边缘"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await ensureHalo();
              setMode((m) => (m === "halo" ? "normal" : "halo"));
            }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              mode === "halo"
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {loadingHalo ? "✨…" : "✨ 光晕"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await ensureDust();
              setMode((m) => (m === "dust" ? "normal" : "dust"));
            }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              mode === "dust"
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {loadingDust ? "🧹…" : "🧹 脏点"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await ensureHist();
              setShowHist((v) => !v);
            }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              showHist 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {tr("📊 直方图", "📊 直方图", "📊 Histogram")}
          </button>
          <button
            type="button"
            onClick={async () => {
              await ensureHist();
              setShowRgbHist((v) => !v);
            }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              showRgbHist 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            🌈 RGB
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              showGrid 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {tr("# 九宫格", "# 九宫格", "# Grid")}
          </button>
          <button
            type="button"
            onClick={() => setShowHorizon((v) => !v)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              showHorizon 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {tr("― 地平线", "― 地平线", "― Horizon")}
          </button>
          <button
            type="button"
            onClick={() => setShowCenter((v) => !v)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              showCenter 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {tr("⊕ 中心", "⊕ 中心", "⊕ Center")}
          </button>
          <button
            type="button"
            onClick={() =>
              setShowMagnify((v) => {
                const next = !v;
                if (!next) {
                  setMagnifyXy(null);
                  return next;
                }
                const el = boxRef.current;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  setMagnifyXy({ x: rect.width / 2, y: rect.height / 2 });
                }
                return next;
              })
            }
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              showMagnify 
                ? "border-sky-500 bg-sky-500/20 text-sky-700 dark:text-sky-300" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {tr("🔍 放大", "🔍 放大", "🔍 Magnify")}
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("↺ 重置", "↺ 重置", "↺ Reset")}
          </button>
          <button
            type="button"
            onClick={() => {
              const el = boxRef.current;
              if (!el) return;
              if (document.fullscreenElement) document.exitFullscreen();
              else el.requestFullscreen().catch(() => {});
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("⛶ 全屏", "⛶ 全屏", "⛶ Fullscreen")}
          </button>
          {showSmartAssessment ? (
            <button
              type="button"
              onClick={() => void ensureSmart()}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                smart
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {loadingSmart ? "🧠…" : tr("🧠 智能评估", "🧠 智能评估", "🧠 Smart assessment")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!canUseRobotReview) return;
              void runRobotReview();
            }}
            disabled={!canUseRobotReview || loadingRobot || !!robotResult}
            title={canUseRobotReview ? undefined : robotReviewBlockedReason ?? undefined}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              canUseRobotReview && robotResult
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : canUseRobotReview
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                  : "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
            }`}
          >
            {loadingRobot
              ? tr("队列AI分析中…", "队列AI分析中…", "Queue AI analyzing…")
              : robotResult
                ? tr("队列AI分析已完成（本图仅一次）", "队列AI分析已完成（本图仅一次）", "Queue AI completed (one-time)")
                : tr("🤖 队列AI分析", "🤖 队列AI分析", "🤖 Queue AI analysis")}
          </button>
        </div>
      </div>

      {mode === "cfd" ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-sky-50 p-3 text-xs dark:border-white/10 dark:bg-sky-950/30">
          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("🎨 增强强度", "🎨 增强强度", "🎨 Enhance strength")}</div>
          <input
            type="range"
            min={2}
            max={30}
            step={1}
            value={cfdGain}
            onChange={(e) => {
              setCfdGain(Number(e.target.value));
            }}
          />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{cfdGain}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("📏 模糊半径", "📏 模糊半径", "📏 Blur radius")}</div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={cfdRadius}
            onChange={(e) => {
              setCfdRadius(Number(e.target.value));
            }}
          />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{cfdRadius}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("👁️ 原图叠加", "👁️ 原图叠加", "👁️ Original overlay")}</div>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={cfdContext}
            onChange={(e) => {
              setCfdContext(Number(e.target.value));
            }}
          />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{Math.round(cfdContext * 100)}%</div>

          <button
            type="button"
            onClick={() => {
              setCfdGain(30);
              setCfdRadius(2);
              setCfdContext(0);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("重置 CFD", "重置 CFD", "Reset CFD")}
          </button>
        </div>
      ) : null}

      {mode === "halo" ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-fuchsia-50 p-3 text-xs dark:border-white/10 dark:bg-fuchsia-950/20">
          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("✨ 光晕强度", "✨ 光晕强度", "✨ Halo strength")}</div>
          <input type="range" min={1} max={50} step={1} value={haloGain} onChange={(e) => setHaloGain(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{haloGain}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("📏 光晕半径", "📏 光晕半径", "📏 Halo radius")}</div>
          <input type="range" min={1} max={8} step={1} value={haloRadius} onChange={(e) => setHaloRadius(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{haloRadius}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("🎯 阈值", "🎯 阈值", "🎯 Threshold")}</div>
          <input type="range" min={0} max={64} step={1} value={haloThreshold} onChange={(e) => setHaloThreshold(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{haloThreshold}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("👁️ 原图叠加", "👁️ 原图叠加", "👁️ Original overlay")}</div>
          <input type="range" min={0} max={0.9} step={0.05} value={haloContext} onChange={(e) => setHaloContext(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{Math.round(haloContext * 100)}%</div>

          <button
            type="button"
            onClick={() => {
              setHaloGain(24);
              setHaloRadius(2);
              setHaloThreshold(3);
              setHaloContext(0.12);
              setHaloContour(false);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("重置光晕", "重置光晕", "Reset halo")}
          </button>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
            <input type="checkbox" checked={haloContour} onChange={(e) => setHaloContour(e.target.checked)} />
            {tr("二值轮廓", "二值轮廓", "Binary contour")}
          </label>
        </div>
      ) : null}

      {mode === "dust" ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-rose-50 p-3 text-xs dark:border-white/10 dark:bg-rose-950/20">
          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("🧹 脏点强度", "🧹 脏点强度", "🧹 Dust strength")}</div>
          <input type="range" min={1} max={50} step={1} value={dustGain} onChange={(e) => setDustGain(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{dustGain}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("📏 背景半径", "📏 背景半径", "📏 Background radius")}</div>
          <input type="range" min={2} max={16} step={1} value={dustRadius} onChange={(e) => setDustRadius(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{dustRadius}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("🎯 阈值", "🎯 阈值", "🎯 Threshold")}</div>
          <input type="range" min={0} max={80} step={1} value={dustThreshold} onChange={(e) => setDustThreshold(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{dustThreshold}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("🔎 最小面积", "🔎 最小面积", "🔎 Min area")}</div>
          <input type="range" min={1} max={200} step={1} value={dustMinArea} onChange={(e) => setDustMinArea(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{dustMinArea}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("🔎 最大面积", "🔎 最大面积", "🔎 Max area")}</div>
          <input type="range" min={10} max={5000} step={10} value={dustMaxArea} onChange={(e) => setDustMaxArea(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{dustMaxArea}</div>

          <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("👁️ 原图叠加", "👁️ 原图叠加", "👁️ Original overlay")}</div>
          <input type="range" min={0} max={1} step={0.05} value={dustContext} onChange={(e) => setDustContext(Number(e.target.value))} />
          <div className="tabular-nums text-slate-700 dark:text-slate-200">{Math.round(dustContext * 100)}%</div>

          <button
            type="button"
            onClick={() => {
              setDustGain(18);
              setDustRadius(7);
              setDustThreshold(5);
              setDustMinArea(2);
              setDustMaxArea(240);
              setDustContext(0.6);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("重置脏点", "重置脏点", "Reset dust")}
          </button>

          {aiTrainingEnabled ? (
            <>
              <button
                type="button"
                onClick={() => setMarkDustMode((v) => !v)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  markDustMode
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                }`}
              >
                {markDustMode
                  ? tr("圈选脏点：开启", "圈选脏点：开启", "Mark dust: ON")
                  : tr("圈选脏点：关闭", "圈选脏点：关闭", "Mark dust: OFF")}
              </button>
              <div className="font-semibold text-slate-700 dark:text-slate-200">{tr("圈选半径", "圈选半径", "Mark radius")}</div>
              <input type="range" min={4} max={50} step={1} value={manualDustRadius} onChange={(e) => setManualDustRadius(Number(e.target.value))} />
              <div className="tabular-nums text-slate-700 dark:text-slate-200">{manualDustRadius}</div>
              <button
                type="button"
                onClick={() => void markAllDetectedAsFalse()}
                disabled={!visibleDustMarks.length || feedbackBusy}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                {tr("一键：检测全错", "一键：检测全错", "All detected are wrong")}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {showHorizon ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("地平线角度", "地平线角度", "Horizon angle")}</div>
          <input type="range" min={-15} max={15} step={0.1} value={horizonDeg} onChange={(e) => setHorizonDeg(Number(e.target.value))} />
          <div className="text-xs text-slate-600 dark:text-slate-300">{horizonDeg.toFixed(1)}°</div>
        </div>
      ) : null}

      {feedbackMessage ? (
        <div className="mt-3 text-xs text-slate-700 dark:text-slate-200">{feedbackMessage}</div>
      ) : null}
      {imageReadError ? <div className="mt-3 text-xs text-red-700 dark:text-red-300">{imageReadError}</div> : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-white/10">
        <div
          ref={boxRef}
          className="relative w-full touch-none overflow-hidden"
          style={{ height: isFullscreen ? "100vh" : 520 }}
          onPointerMove={onPointerMove}
          onPointerDown={(e) => addManualDustMarkAt(e.clientX, e.clientY)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={displayedUrl}
            alt="preview"
            className="absolute left-1/2 top-1/2 z-0 max-h-none max-w-none select-none"
            style={{ transform: `translate(-50%, -50%) scale(${renderScale})` }}
            draggable={false}
            onLoad={() => {
              setImageReadError(null);
              // ensure baseScale calculated
              const el = boxRef.current;
              const img = imgRef.current;
              if (!el || !img) return;
              const rect = el.getBoundingClientRect();
              const w = img.naturalWidth || 0;
              const h = img.naturalHeight || 0;
              if (!rect.width || !rect.height || !w || !h) return;
              const s = Math.min(rect.width / w, rect.height / h);
              setBaseScale(s);
              setImgSize({ w, h });
            }}
            onError={() => setImageReadError(tr("读取图片失败，请重新上传或刷新页面。", "读取图片失败，请重新上传或刷新页面。", "Failed to read image. Re-upload or refresh and try again."))}
          />

          {/* Overlays are bound to image (not the viewport) for accurate crop/horizon checks */}
          {imgSize ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-10"
              style={{
                width: imgSize.w,
                height: imgSize.h,
                transform: `translate(-50%, -50%) scale(${renderScale})`,
                transformOrigin: "50% 50%",
              }}
            >
              {showGrid ? <div className="absolute inset-0" style={gridStyle} /> : null}
              {showHorizon ? (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="h-[3px] w-[130%] bg-red-500/90" style={horizonStyle} />
                </div>
              ) : null}
              {showCenter ? (
                <div className="absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 bg-amber-300/90" />
                  <div className="absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 bg-amber-300/90" />
                </div>
              ) : null}
              {mode === "dust" && aiTrainingEnabled ? (
                <div className="absolute inset-0 pointer-events-none">
                  {visibleDustMarks.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={tr("此点不是脏点", "此点不是脏点", "This is not dust")}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-400/90 bg-red-500/10 text-[10px] font-bold text-white pointer-events-auto hover:bg-red-500/20"
                      style={{ left: m.x, top: m.y, width: m.r * 2, height: m.r * 2 }}
                      onClick={() => void markDetectedAsFalsePositive(m)}
                    >
                      ✕
                    </button>
                  ))}
                  {manualDustMarks.map((m) => (
                    <div
                      key={m.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300/90 bg-emerald-500/10"
                      style={{ left: m.x, top: m.y, width: m.r * 2, height: m.r * 2 }}
                      title={tr("手动标注脏点", "手动标注脏点", "Manual dust mark")}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {magnifyStyle ? <div className="pointer-events-none absolute z-20" style={magnifyStyle} /> : null}
        </div>
      </div>

      {hist && (showHist || showRgbHist) ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {showHist ? <HistCard title="📊 亮度直方图" data={hist.luma} color="#60a5fa" /> : null}
          {showRgbHist ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">🌈 RGB 分量</div>
              <div className="mt-3 grid gap-2">
                <HistMini label="R" data={hist.r} color="rgba(248,113,113,.95)" />
                <HistMini label="G" data={hist.g} color="rgba(74,222,128,.95)" />
                <HistMini label="B" data={hist.b} color="rgba(96,165,250,.95)" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showSmartAssessment && smart ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {tr("🧠 智能评估（仅审核员可见）", "🧠 智能评估（仅审核员可见）", "🧠 Smart assessment (reviewers only)")}
          </div>
          <div className="mt-3 grid gap-2 text-xs text-slate-700 dark:text-slate-200 md:grid-cols-3">
            <div>Mean Luma: {smart.meanLuma.toFixed(1)}</div>
            <div>Contrast: {smart.contrastStd.toFixed(1)}</div>
            <div>Saturation: {smart.saturationMean.toFixed(1)}</div>
            <div>Highlight Clip: {smart.highlightClipPct.toFixed(2)}%</div>
            <div>Shadow Clip: {smart.shadowClipPct.toFixed(2)}%</div>
            <div>Sharpness: {smart.sharpness.toFixed(1)}</div>
            <div>Noise: {smart.noise.toFixed(1)}</div>
            <div>Dust Candidates: {smart.dustCandidates}</div>
            <div>
              Size: {smart.width} x {smart.height}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {smart.suggestions.map((s, idx) => (
              <div
                key={`${s.key}-${idx}`}
                className={`rounded-xl px-3 py-2 text-xs ${
                  s.level === "warn"
                    ? "border border-red-400/30 bg-red-500/10 text-red-800 dark:text-red-100"
                    : "border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                }`}
              >
                <div>{smartText(s.key)}</div>
                {aiTrainingEnabled ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void postAiFeedback({ event: "smart_suggestion_correct", suggestionKey: s.key })}
                      disabled={feedbackBusy}
                      className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 disabled:opacity-60 dark:text-emerald-200"
                    >
                      {tr("判断正确", "判断正确", "Correct")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void postAiFeedback({ event: "smart_suggestion_wrong", suggestionKey: s.key })}
                      disabled={feedbackBusy}
                      className="rounded-md border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-800 disabled:opacity-60 dark:text-red-200"
                    >
                      {tr("判断错误", "判断错误", "Wrong")}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {canUseRobotReview || robotReviewBlockedReason ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {tr("🤖 机器人审图结果（仅审核员可见）", "🤖 机器人审图结果（仅审核员可见）", "🤖 Robot analysis (reviewers only)")}
          </div>
          {!canUseRobotReview && robotReviewBlockedReason ? (
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{robotReviewBlockedReason}</div>
          ) : null}
          {robotErr ? <div className="mt-2 text-xs text-red-700 dark:text-red-200">{robotErr}</div> : null}
          {!robotResult ? (
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {tr("尚无结果。点击上方“机器人分析”可执行一次。", "尚无结果。点击上方“机器人分析”可执行一次。", "No result yet. Click the robot analysis button above to run once.")}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-slate-700 dark:text-slate-200">{robotResult.result.summary}</div>
              {robotResult.result.fatalError ? <div className="text-xs text-red-700 dark:text-red-200">{robotResult.result.fatalError}</div> : null}
              <div className="grid gap-2 md:grid-cols-2">
                {robotResult.result.checks.map((c) => (
                  <div
                    key={c.key}
                    className={`rounded-xl px-3 py-2 text-xs ${
                      c.hasIssue
                        ? "border border-red-400/30 bg-red-500/10 text-red-800 dark:text-red-100"
                        : "border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                    }`}
                  >
                    <div className="font-semibold">
                      {c.label}：{c.hasIssue ? tr("有问题", "有问题", "Issue") : tr("正常", "正常", "OK")} ({c.count})
                    </div>
                    {c.detail ? <div className="mt-1">{c.detail}</div> : null}
                  </div>
                ))}
              </div>
              {robotResult.result.claimedTagChecks.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <div className="font-semibold">{tr("标签匹配检查", "标签匹配检查", "Tag matching checks")}</div>
                  <div className="mt-2 space-y-1">
                    {robotResult.result.claimedTagChecks.map((x, i) => (
                      <div key={`${x.tag}-${i}`}>
                        {x.tag}：{x.matched ? tr("匹配", "匹配", "Matched") : tr("不匹配", "不匹配", "Mismatch")} ({Math.round(x.confidence * 100)}%) {x.detail}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {robotResult.result.mismatchHints.length ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
                  <div className="font-semibold">{tr("不一致提示", "不一致提示", "Mismatch hints")}</div>
                  <ul className="mt-1 list-disc pl-5">
                    {robotResult.result.mismatchHints.map((x, i) => (
                      <li key={`${x}-${i}`}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function HistCard({ title, data, color }: { title: string; data: Uint32Array; color: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 256;
    c.height = 110;
    drawHistogram(c, data, color);
  }, [data, color]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</div>
      <canvas ref={ref} className="mt-3 h-[110px] w-full rounded-xl border border-slate-200 bg-black/20 dark:border-white/10" />
    </div>
  );
}

function HistMini({ label, data, color }: { label: string; data: Uint32Array; color: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 256;
    c.height = 60;
    drawHistogram(c, data, color);
  }, [data, color]);
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</div>
      <canvas ref={ref} className="h-[60px] w-full rounded-xl border border-slate-200 bg-black/20 dark:border-white/10" />
    </div>
  );
}

