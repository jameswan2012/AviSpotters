"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { FeaturedPhotoItem } from "@/components/home/FeaturedPhotoScroller";

const AUTO_SWITCH_MS = 4500;

export function FeaturedPhotoCarousel({
  title,
  subtitle,
  photos,
  viewMoreLabel,
  prevLabel,
  nextLabel,
}: {
  title: string;
  subtitle: string;
  photos: FeaturedPhotoItem[];
  viewMoreLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const items = photos ?? [];
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const safeIdx = useMemo(() => {
    if (!items.length) return 0;
    return Math.max(0, Math.min(idx, items.length - 1));
  }, [idx, items.length]);

  function jumpTo(nextIdx: number) {
    setIdx(nextIdx);
    elapsedRef.current = 0;
    setProgress(0);
  }

  function prev() {
    if (!items.length) return;
    jumpTo((safeIdx - 1 + items.length) % items.length);
  }

  function next() {
    if (!items.length) return;
    jumpTo((safeIdx + 1) % items.length);
  }

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, [safeIdx]);

  useEffect(() => {
    if (!items.length) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTsRef.current = null;

    const loop = (ts: number) => {
      if (!items.length) return;
      if (lastTsRef.current == null) {
        lastTsRef.current = ts;
      } else {
        const delta = ts - lastTsRef.current;
        lastTsRef.current = ts;
        if (!paused) {
          elapsedRef.current += delta;
          if (elapsedRef.current >= AUTO_SWITCH_MS) {
            elapsedRef.current %= AUTO_SWITCH_MS;
            setIdx((p) => (items.length ? (p + 1) % items.length : 0));
          }
          setProgress(Math.max(0, Math.min(1, elapsedRef.current / AUTO_SWITCH_MS)));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [items.length, paused]);

  if (!items.length) return null;

  return (
    <section className="ios26-surface relative overflow-hidden rounded-[1.95rem] p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{subtitle}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/photos/featured" className="ios26-tile rounded-full px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {viewMoreLabel} →
          </Link>
        </div>
      </div>

      <div
        className="mt-4 overflow-hidden rounded-2xl border border-sky-200/55 bg-sky-950/10 shadow-inner dark:border-sky-300/20 dark:bg-sky-950/35"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="relative aspect-[16/10] bg-slate-100 dark:bg-sky-950/40">
          {items.map((item, i) => {
            const active = i === safeIdx;
            return (
              <Link
                key={item.id}
                href={`/photos/${encodeURIComponent(item.id)}`}
                className={[
                  "absolute inset-0 block transition-all duration-700 ease-out",
                  active ? "z-10 opacity-100 scale-100" : "z-0 pointer-events-none opacity-0 scale-[1.01]",
                ].join(" ")}
                aria-hidden={!active}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/8 to-transparent" />
                <div className="featured-gradient-sweep pointer-events-none absolute inset-0 opacity-60" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${encodeURIComponent(item.id)}/image?variant=display`}
                  alt={item.title ?? item.registration}
                  className="relative h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-black/40 px-2 py-1 text-xs font-extrabold tracking-wider text-white">{item.registration}</span>
                    <span className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white">{item.aircraftModel}</span>
                    <span className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white">{item.airline}</span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-white">
                    {item.title ?? `${item.registration}｜${item.aircraftModel}`}
                  </div>
                  <div className="mt-1 truncate text-xs text-white/85">
                    {item.shotAirport} · {item.shotAt}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <div className="mr-1 h-1.5 w-1.5 rounded-full bg-sky-300/35 dark:bg-sky-200/20" />
          <div className="flex flex-wrap gap-1.5">
            {items.map((_, i) => {
              const active = i === safeIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={[
                    "relative rounded-full transition-all duration-300",
                    active
                      ? "h-2 w-7 bg-sky-400/90 shadow-[0_0_0_1px_rgba(125,211,252,0.35)] dark:bg-sky-300/85"
                      : "h-2 w-2 bg-sky-300/45 hover:bg-sky-300/70 dark:bg-sky-200/20 dark:hover:bg-sky-200/35",
                  ].join(" ")}
                  aria-label={`Go to slide ${i + 1}`}
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-sky-200/65 bg-white/35 p-1 backdrop-blur dark:border-sky-200/20 dark:bg-sky-950/40">
          <button
            type="button"
            onClick={prev}
            className="group inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200/65 bg-white/60 text-slate-700 hover:bg-white dark:border-sky-200/20 dark:bg-sky-900/70 dark:text-sky-100 dark:hover:bg-sky-800/75"
            aria-label={prevLabel}
          >
            <span className="sr-only">{prevLabel}</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" aria-hidden="true">
              <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="group inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200/65 bg-white/60 text-slate-700 hover:bg-white dark:border-sky-200/20 dark:bg-sky-900/70 dark:text-sky-100 dark:hover:bg-sky-800/75"
            aria-label={nextLabel}
          >
            <span className="sr-only">{nextLabel}</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" aria-hidden="true">
              <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="pointer-events-none mt-1.5 px-1">
        <div className="flex items-center gap-1.5">
          {items.map((_, i) => {
            const done = i < safeIdx;
            const active = i === safeIdx;
            const fill = done ? 100 : active ? Math.round(progress * 100) : 0;
            return (
              <div key={`p-${i}`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-300/20 dark:bg-sky-200/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400/85 to-cyan-300/85 transition-[width] duration-150 ease-linear dark:from-sky-300/80 dark:to-cyan-200/80"
                  style={{ width: `${fill}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

