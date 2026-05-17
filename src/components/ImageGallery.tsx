"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function ImageGallery({
  images,
  title,
  openText,
  closeText,
  prevText,
  nextText,
}: {
  images: string[];
  title: string;
  openText: string;
  closeText: string;
  prevText: string;
  nextText: string;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const safeImages = useMemo(() => images.filter(Boolean), [images]);

  const openAt = useCallback((i: number) => {
    setIdx(i);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => setIdx((x) => (x - 1 + safeImages.length) % safeImages.length), [safeImages.length]);
  const next = useCallback(() => setIdx((x) => (x + 1) % safeImages.length), [safeImages.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, prev, next]);

  if (!safeImages.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="text-sm font-semibold text-white">{title}</div>
        <button
          type="button"
          onClick={() => openAt(0)}
          className="rounded-lg border border-white/10 bg-sky-950/30 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-sky-950/40"
        >
          {openText}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {safeImages.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => openAt(i)}
            className="group overflow-hidden rounded-xl border border-white/10 bg-sky-950/30 hover:bg-sky-950/40"
          >
            <div className="aspect-[16/10] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`image-${i + 1}`}
                className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                loading="lazy"
              />
            </div>
          </button>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-sky-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="text-sm font-semibold text-white">
                {idx + 1} / {safeImages.length}
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/10"
              >
                {closeText}
              </button>
            </div>

            <div className="relative bg-black">
              <div className="max-h-[72vh] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={safeImages[idx]}
                  alt={`preview-${idx + 1}`}
                  className="h-full w-full object-contain"
                />
              </div>
              {safeImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    aria-label={prevText}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    aria-label={nextText}
                  >
                    →
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

