"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DEFAULT_WATERMARK_STATE, type WatermarkState } from "@/components/photos/WatermarkEditor";

function PdfDownloadInner() {
  const searchParams = useSearchParams();
  const imageUrl = searchParams.get("url");
  const [watermark, setWatermark] = useState<WatermarkState>(DEFAULT_WATERMARK_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse watermark from URL if provided
  useEffect(() => {
    const wmParam = searchParams.get("watermark");
    if (wmParam) {
      try {
        const parsed = JSON.parse(wmParam);
        setWatermark({ ...DEFAULT_WATERMARK_STATE, ...parsed });
      } catch {}
    }
  }, [searchParams]);

  const generatePdf = async () => {
    if (!imageUrl) return;
    setLoading(true);
    setError(null);

    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import("jspdf");

      // Load image
      const img = new Image();
      img.crossOrigin = "anonymous";
      const imgLoadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });
      img.src = imageUrl;
      await imgLoadPromise;

      // Calculate dimensions
      const widthMm = 210;
      const heightMm = 297;
      const margin = 10;
      const aspectRatio = img.naturalWidth / img.naturalHeight;

      let printWidth = widthMm - 2 * margin;
      let printHeight = printWidth / aspectRatio;

      if (printHeight > heightMm - 2 * margin) {
        printHeight = heightMm - 2 * margin;
        printWidth = printHeight * aspectRatio;
      }

      const x = (widthMm - printWidth) / 2;
      const y = (heightMm - printHeight) / 2;

      // Create PDF
      const doc = new jsPDF({
        orientation: printWidth > printHeight ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      // Convert image to base64
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg", 0.95);

      // Add image to PDF
      doc.addImage(base64, "JPEG", x, y, printWidth, printHeight);

      // Add watermark
      if (watermark.enabled) {
        // Scale watermark to match preview
        const scale = printWidth / 640;
        const fontSize = watermark.fontSize * scale;
        doc.setFontSize(fontSize);
        
        // Position calculation
        const wmX = x + printWidth * watermark.position.x;
        const wmY = y + printHeight * watermark.position.y;
        
        // Draw black shadow first
        doc.setTextColor(0, 0, 0);
        doc.text("AviSpotters", wmX + 1, wmY + 1);
        
        // Draw white text on top
        doc.setTextColor(255, 255, 255);
        doc.text("AviSpotters", wmX, wmY);
      }

      // Download
      doc.save(`avispotters-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("生成PDF失败");
    } finally {
      setLoading(false);
    }
  };

  if (!imageUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-white">缺少图片参数</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h1 className="mb-4 text-xl font-bold text-white">生成 PDF</h1>
        
      {/* Preview with watermark */}
      <div className="mb-4 overflow-hidden rounded-xl">
        <div className="relative bg-slate-800">
          <img src={imageUrl} alt="Preview" className="w-full" />
          {watermark.enabled && (
            <div
              className="absolute flex items-center gap-1 text-white font-bold"
              style={{
                left: `${watermark.position.x * 100}%`,
                top: `${watermark.position.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${watermark.fontSize * 0.5}px`,
                opacity: watermark.opacity,
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              <svg viewBox="0 0 48 48" className="h-[0.85em] w-[0.85em]" style={{ fill: "currentColor" }}>
                <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="24" cy="24" r="12" fill="currentColor" opacity="0.3" />
                <circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="20" r="3" fill="white" opacity="0.6" />
              </svg>
              <span>AviSpotters</span>
            </div>
          )}
        </div>
      </div>

        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="wm-enabled"
            checked={watermark.enabled}
            onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
            className="h-5 w-5"
          />
          <label htmlFor="wm-enabled" className="text-white">
            添加水印
          </label>
        </div>

        {watermark.enabled && (
          <div className="mb-4 space-y-3 rounded-xl bg-slate-800 p-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">水印大小</label>
              <input
                type="range"
                min="8"
                max="80"
                value={watermark.fontSize}
                onChange={(e) => setWatermark({ ...watermark, fontSize: Number(e.target.value) })}
                className="h-2 w-full accent-sky-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">透明度</label>
              <input
                type="range"
                min="5"
                max="95"
                value={watermark.opacity * 100}
                onChange={(e) => setWatermark({ ...watermark, opacity: Number(e.target.value) / 100 })}
                className="h-2 w-full accent-sky-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">位置</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { x: 0.08, y: 0.08, label: "左上" },
                  { x: 0.5, y: 0.08, label: "中上" },
                  { x: 0.92, y: 0.08, label: "右上" },
                  { x: 0.08, y: 0.5, label: "左中" },
                  { x: 0.5, y: 0.5, label: "居中" },
                  { x: 0.92, y: 0.5, label: "右中" },
                  { x: 0.08, y: 0.92, label: "左下" },
                  { x: 0.5, y: 0.92, label: "中下" },
                  { x: 0.92, y: 0.92, label: "右下" },
                ].map((pos) => (
                  <button
                    key={pos.label}
                    onClick={() => setWatermark({ ...watermark, position: { x: pos.x, y: pos.y } })}
                    className={`rounded-lg border px-2 py-1 text-xs ${
                      Math.abs(watermark.position.x - pos.x) < 0.08 && Math.abs(watermark.position.y - pos.y) < 0.08
                        ? "border-sky-500 bg-sky-500/20 text-white"
                        : "border-slate-600 text-slate-400"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-red-400">{error}</p>}

        <button
          onClick={generatePdf}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-3 text-lg font-bold text-white hover:from-red-400 hover:to-rose-500 disabled:opacity-50"
        >
          {loading ? "生成中…" : "📄 下载 PDF"}
        </button>
      </div>
    </div>
  );
}

export default function PdfDownloadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PdfDownloadInner />
    </Suspense>
  );
}
