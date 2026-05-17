"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClientLocale } from "@/i18n/client-locale";
import { DEFAULT_PHOTO_CATEGORY_SETTING, type PhotoCategoryDef, type PhotoCategorySetting } from "@/lib/photo-categories";

interface ExtractedImage {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

// PDF.js types
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function PdfImportPage() {
  const router = useRouter();
  const locale = useClientLocale();
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; summary: string } | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const pdfDocRef = useRef<any>(null);

  // Form fields
  const [registration, setRegistration] = useState("");
  const [shotAt, setShotAt] = useState("");
  const [shotAirport, setShotAirport] = useState("");
  const [airline, setAirline] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");
  const [domain, setDomain] = useState<string>("domain_civil");
  const [tagCategories, setTagCategories] = useState<string[]>([]);
  const [replyLocale, setReplyLocale] = useState<"zh-Hant" | "zh-Hans" | "en">(locale === "en" ? "en" : locale === "zh-Hans" ? "zh-Hans" : "zh-Hant");

  // Categories
  const [photoCategorySetting, setPhotoCategorySetting] = useState<PhotoCategorySetting | null>(null);

  const tr = useCallback(
    (zhHant: string, zhHans: string, en: string) => {
      return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
    },
    [locale]
  );

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/photo-categories");
      const json = (await res.json()) as { setting?: PhotoCategorySetting };
      const setting = json?.setting && json.setting.version === 1 && Array.isArray(json.setting.categories) ? json.setting : null;
      setPhotoCategorySetting(setting ?? DEFAULT_PHOTO_CATEGORY_SETTING);
    } catch {
      setPhotoCategorySetting(DEFAULT_PHOTO_CATEGORY_SETTING);
    }
  }, []);

  // Load categories and PDF.js on mount
  useEffect(() => {
    loadCategories();

    // Load PDF.js from CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs";
    script.type = "module";
    script.onload = async () => {
      try {
        const pdfjsLib = window.pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs";
          setPdfLoaded(true);
        }
      } catch (e) {
        console.error("Failed to initialize PDF.js:", e);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
    };
  }, [loadCategories]);

  const catRows = photoCategorySetting?.categories ?? DEFAULT_PHOTO_CATEGORY_SETTING.categories;
  const domainOptions = catRows.filter((c) => c.group === "domain" && c.enabled !== false);
  const tagOptions = catRows.filter((c) => c.group === "tag" && c.enabled !== false);

  const labelFor = useCallback(
    (c: PhotoCategoryDef) => {
      return locale === "en" ? c.en : locale === "zh-Hans" ? c.zhHans : c.zhHant;
    },
    [locale]
  );

  // Extract images from PDF using client-side PDF.js
  const extractImagesFromPdf = useCallback(async (dataUrl: string) => {
    if (!window.pdfjsLib || !pdfLoaded) {
      setError(tr("PDF library not loaded", "PDF库未加载", "PDF library not loaded"));
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const pdfjsLib = window.pdfjsLib;
      const loadingTask = pdfjsLib.getDocument(dataUrl);
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;

      const images: ExtractedImage[] = [];
      const scale = 1.5; // Render at 1.5x for decent quality

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        images.push({
          pageNum,
          dataUrl,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });
      }

      setExtractedImages(images);
      // Auto-select all images
      setSelectedPages(new Set(images.map((img) => img.pageNum)));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("提取失败", "提取失败", "Extraction failed"));
    } finally {
      setExtracting(false);
    }
  }, [pdfLoaded, tr]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError(tr("只支持 PDF 文件", "只支持 PDF 文件", "Only PDF files are supported"));
      return;
    }

    setFile(selected);
    setError(null);
    setExtracting(true);
    setExtractedImages([]);
    setSelectedPages(new Set());
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selected);

      const res = await fetch("/api/admin/photos/pdf-import/extract", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process PDF");
      }

      // Now extract images client-side
      setPdfDataUrl(json.pdfDataUrl);
      await extractImagesFromPdf(json.pdfDataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("处理失败", "处理失败", "Processing failed"));
      setExtracting(false);
    }
  };

  const togglePage = (pageNum: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageNum)) {
      newSelected.delete(pageNum);
    } else {
      newSelected.add(pageNum);
    }
    setSelectedPages(newSelected);
  };

  const selectAll = () => {
    setSelectedPages(new Set(extractedImages.map((img) => img.pageNum)));
  };

  const selectNone = () => {
    setSelectedPages(new Set());
  };

  const handleSubmit = async () => {
    if (selectedPages.size === 0) {
      setError(tr("请至少选择一张图片", "请至少选择一张图片", "Please select at least one image"));
      return;
    }

    if (!registration.trim() || !shotAirport.trim() || !aircraftModel.trim() || !airline.trim()) {
      setError(tr("请填写：/机型注册号/机场/航空公司", "请填写：注册号/机场/机型/航空公司", "Please fill in: registration/airport/model/airline"));
      return;
    }

    if (!domain) {
      setError(tr("请选择分类", "请选择分类", "Please select a category"));
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const selectedImages = extractedImages.filter((img) => selectedPages.has(img.pageNum));

      const formData = new FormData();
      formData.append("imagesJson", JSON.stringify(selectedImages));
      formData.append("registration", registration.trim());
      formData.append("shotAirport", shotAirport.trim());
      formData.append("aircraftModel", aircraftModel.trim());
      formData.append("airline", airline.trim());
      formData.append("shotAt", shotAt.trim());
      formData.append("categoriesJson", JSON.stringify([domain, ...tagCategories]));
      formData.append("replyLocale", replyLocale);

      const res = await fetch("/api/admin/photos/pdf-import/batch-upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Upload failed");
      }

      setUploadResult({ success: true, summary: json.summary });
      setFile(null);
      setExtractedImages([]);
      setSelectedPages(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("上传失败", "上传失败", "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {tr("PDF 导入", "PDF 导入", "PDF Import")}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {tr("从 PDF 文件中提取图片并批量上传到待审核队列", "从 PDF 文件中提取图片并批量上传到待审核队列", "Extract images from PDF and batch upload to pending review queue")}
          </p>
        </div>
      </div>

      {!pdfLoaded && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          {tr("正在加载 PDF 处理库...", "正在加载 PDF 处理库...", "Loading PDF processing library...")}
        </div>
      )}

      {uploadResult && (
        <div className="rounded-2xl border border-green-400/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span className="font-semibold text-green-100">{uploadResult.summary}</span>
          </div>
          <button
            onClick={() => {
              setUploadResult(null);
              setFile(null);
              setExtractedImages([]);
              setSelectedPages(new Set());
            }}
            className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
          >
            {tr("继续导入", "继续导入", "Continue Importing")}
          </button>
        </div>
      )}

      {/* Upload PDF */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("1. 选择 PDF 文件", "1. 选择 PDF 文件", "1. Select PDF File")}</div>
        <div className="mt-3">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={extracting || uploading || !pdfLoaded}
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-950 hover:file:bg-sky-400 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          />
        </div>
        {extracting && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
            {tr("正在提取图片...", "正在提取图片...", "Extracting images...")}
          </div>
        )}
      </div>

      {/* Extracted Images */}
      {extractedImages.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {tr("2. 选择要导入的图片", "2. 选择要导入的图片", "2. Select Images to Import")}
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-sky-600 hover:text-sky-500 dark:text-sky-300">
                {tr("全选", "全选", "Select All")}
              </button>
              <span className="text-slate-400">|</span>
              <button onClick={selectNone} className="text-xs text-sky-600 hover:text-sky-500 dark:text-sky-300">
                {tr("取消", "取消", "Clear")}
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {tr(`已选择 ${selectedPages.size} / ${extractedImages.length} 张图片`, `已选择 ${selectedPages.size} / ${extractedImages.length} 张图片`, `Selected ${selectedPages.size} / ${extractedImages.length} images`)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {extractedImages.map((img) => (
              <button
                key={img.pageNum}
                onClick={() => togglePage(img.pageNum)}
                className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                  selectedPages.has(img.pageNum)
                    ? "border-sky-500 ring-2 ring-sky-500/30"
                    : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                }`}
              >
                <img src={img.dataUrl} alt={`Page ${img.pageNum}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white">
                  {img.pageNum}
                </div>
                {selectedPages.has(img.pageNum) && (
                  <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Form */}
      {extractedImages.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("3. 填写照片信息（批量应用）", "3. 填写照片信息（批量应用）", "3. Fill Photo Info (Applied to All)")}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tr("以下信息将应用到所有选中的图片", "以下信息将应用到所有选中的图片", "This info will be applied to all selected images")}
          </div>

          {/* Categories */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("分类（必选）", "分类（必选）", "Category (required)")}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {domainOptions.map((c) => {
                const active = domain === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDomain(c.id)}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                      active
                        ? "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {labelFor(c)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("标签（可多选）", "标签（可多选）", "Tags (multi-select)")}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tagOptions.map((c) => {
                const active = tagCategories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTagCategories((prev) => (active ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                      active
                        ? "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {labelFor(c)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fields */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("注册号（必填）", "注册号（必填）", "Registration (required)")}</div>
              <input
                type="text"
                value={registration}
                onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                placeholder="B-32A1 / N123AA"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("拍摄日期", "拍摄日期", "Shot Date")}</div>
              <input
                type="date"
                value={shotAt}
                onChange={(e) => setShotAt(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("拍摄机场（必填）", "拍摄机场（必填）", "Airport (required)")}</div>
              <input
                type="text"
                value={shotAirport}
                onChange={(e) => setShotAirport(e.target.value)}
                placeholder="北京首都国际机场 / PEK"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("航空公司（必填）", "航空公司（必填）", "Airline (required)")}</div>
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="中国国航 / Air China"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
              />
            </label>
            <label className="block md:col-span-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("机型（必填）", "机型（必填）", "Aircraft Model (required)")}</div>
              <input
                type="text"
                value={aircraftModel}
                onChange={(e) => setAircraftModel(e.target.value)}
                placeholder="A359 / B77W"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
              />
            </label>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">{tr("回复语言", "回复语言", "Reply Language")}</label>
            <select
              value={replyLocale}
              onChange={(e) => setReplyLocale(e.target.value as any)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white"
            >
              <option value="zh-Hans">{tr("中文（简体）", "中文（简体）", "Chinese (Simplified)")}</option>
              <option value="zh-Hant">{tr("中文（繁体）", "中文（繁体）", "Chinese (Traditional)")}</option>
              <option value="en">{tr("英文", "英文", "English")}</option>
            </select>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Submit */}
      {extractedImages.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push("/admin/photos")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("取消", "取消", "Cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || selectedPages.size === 0}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold",
              uploading || selectedPages.size === 0
                ? "cursor-not-allowed border border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5"
                : "bg-sky-500 text-sky-950 hover:bg-sky-400",
            ].join(" ")}
          >
            {uploading
              ? tr("导入中...", "导入中...", "Importing...")
              : tr(`导入 ${selectedPages.size} 张照片`, `导入 ${selectedPages.size} 张照片`, `Import ${selectedPages.size} Photos`)}
          </button>
        </div>
      )}
    </div>
  );
}
