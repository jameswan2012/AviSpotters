"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PhotoInspector } from "@/components/photos/PhotoInspector";
import { useClientLocale } from "@/i18n/client-locale";

export default function SelfPhotoInspectorPage() {
  const locale = useClientLocale();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  function tr(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  function clearCurrentObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(tr("請選擇圖片檔案。", "请选择图片文件。", "Please select an image file."));
      return;
    }
    clearCurrentObjectUrl();
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setImageUrl(nextUrl);
  }

  useEffect(() => {
    return () => clearCurrentObjectUrl();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{tr("自助審圖工具", "自助审图工具", "Self photo inspector")}</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {tr("上傳一張圖片，即可自行使用審圖工具檢查曝光、地平線、脏點等。", "上传一张图片，即可自行使用审图工具检查曝光、地平线、脏点等。", "Upload one photo and run exposure, horizon, dust, and other checks yourself.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/photos/upload" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
            {tr("返回上傳", "返回上传", "Back to upload")}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div
          className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400"
            >
              {tr("選擇圖片", "选择图片", "Choose image")}
            </button>
            <span>{tr("或直接拖拽圖片到此區域。", "或直接拖拽图片到此区域。", "Or drag an image into this area.")}</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error ? <div className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}
      </div>

      {imageUrl ? (
        <PhotoInspector imageUrl={imageUrl} photoId="self-upload" showSmartAssessment={false} aiTrainingEnabled={false} canUseRobotReview={false} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {tr("尚未選擇圖片。", "尚未选择图片。", "No image selected yet.")}
        </div>
      )}
    </div>
  );
}

