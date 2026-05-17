"use client";

import { useMemo } from "react";
import type { DynamicWatermarkSetting } from "@/lib/site-settings";

function escXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function svgDataUrl(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function DynamicWatermarkOverlay({
  enabled,
  text,
  setting,
}: {
  enabled: boolean;
  text: string;
  setting: DynamicWatermarkSetting;
}) {
  const bg = useMemo(() => {
    const label = escXml(text || "AviSpotters");
    // Pattern tile size. Density scales it (smaller tile => denser).
    const baseW = 360;
    const baseH = 220;
    const d = Math.max(0.5, Math.min(3, Number(setting.density) || 1));
    const w = Math.round(baseW / d);
    const h = Math.round(baseH / d);
    const font = Math.max(12, Math.round(16 / d));
    const angle = Math.max(-60, Math.min(60, Number(setting.angleDeg) || -22));
    const fontFamily =
      `"Noto Sans CJK SC","Noto Sans CJK TC","Noto Sans SC","Noto Sans TC","PingFang SC","PingFang TC","Hiragino Sans GB","Microsoft YaHei","Heiti SC","WenQuanYi Micro Hei","Arial Unicode MS",system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <g transform="rotate(${angle} ${w / 2} ${h / 2})">
    <text x="${Math.round(w * 0.08)}" y="${Math.round(h * 0.55)}" font-family="${fontFamily}" font-size="${font}" font-weight="700" fill="white" fill-opacity="1">${label}</text>
    <text x="${Math.round(w * 0.08)}" y="${Math.round(h * 0.55) + font + 6}" font-family="${fontFamily}" font-size="${Math.max(
      10,
      font - 2
    )}" font-weight="600" fill="white" fill-opacity="1">AviSpotters</text>
  </g>
</svg>`;
    return svgDataUrl(svg);
  }, [text, setting.density, setting.angleDeg]);

  const speed = Math.max(10, Math.min(300, Math.round(Number(setting.speedSec) || 60)));
  const rightOpacity = Math.max(0, Math.min(0.3, Number(setting.opacityRight) || 0));
  const leftOpacity = Math.max(0, Math.min(0.3, Number(setting.opacityLeft) || 0));

  if (!enabled || !setting.enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        backgroundImage: bg,
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
        WebkitMaskImage: `linear-gradient(to left, rgba(0,0,0,${rightOpacity}), rgba(0,0,0,${leftOpacity}))`,
        maskImage: `linear-gradient(to left, rgba(0,0,0,${rightOpacity}), rgba(0,0,0,${leftOpacity}))`,
        animation: `avispotters-wm-slide ${speed}s linear infinite`,
        mixBlendMode: "soft-light",
      }}
    />
  );
}

