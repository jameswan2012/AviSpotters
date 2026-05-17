"use client";

import { useMemo, useState } from "react";

export function PdfEmbedViewer({
  url,
  title,
  heightPx,
}: {
  url: string;
  title: string;
  heightPx: number;
}) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState<"page-width" | "page-fit" | "100">("page-width");

  const src = useMemo(() => {
    const base = url.trim();
    if (!base) return "";
    // Use browser PDF viewer hash params for in-page reading UI.
    const hash = `#toolbar=1&navpanes=0&scrollbar=1&page=${page}&zoom=${zoom}`;
    return base.includes("#") ? `${base.split("#")[0]}${hash}` : `${base}${hash}`;
  }, [url, page, zoom]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          PDF · {title}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            上一页
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            下一页
          </button>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            页面
            <input
              type="number"
              min={1}
              max={999}
              value={page}
              onChange={(e) => setPage(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
              className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            缩放
            <select
              value={zoom}
              onChange={(e) => setZoom(e.target.value as "page-width" | "page-fit" | "100")}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5"
            >
              <option value="page-width">宽度适配</option>
              <option value="page-fit">整页适配</option>
              <option value="100">100%</option>
            </select>
          </label>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">第 {page} 页</div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            新窗口浏览
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-sky-950/30">
        <iframe
          src={src}
          title={title}
          className="w-full"
          style={{ height: heightPx }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

