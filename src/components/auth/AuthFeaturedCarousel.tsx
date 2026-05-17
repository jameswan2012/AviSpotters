"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type Item = {
  id: string;
  registration: string;
  title: string | null;
  author: { id: string; name: string };
};

type AuthFeaturedCarouselProps = {
  /** Full-bleed background behind a centered card (stacking layers, not document flow below). */
  variant?: "card" | "backdrop";
};

export function AuthFeaturedCarousel({ variant = "card" }: AuthFeaturedCarouselProps) {
  const locale = useClientLocale();
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);

  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/photos/featured-roll?take=10", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as any;
        const rows = Array.isArray(json?.photos) ? (json.photos as any[]) : [];
        const parsed: Item[] = rows
          .map((r) => ({
            id: String(r?.id ?? ""),
            registration: String(r?.registration ?? ""),
            title: typeof r?.title === "string" ? r.title : r?.title == null ? null : String(r.title),
            author: { id: String(r?.author?.id ?? ""), name: String(r?.author?.name ?? "") },
          }))
          .filter((r) => r.id && r.registration && r.author.id && r.author.name);
        if (!alive) return;
        setItems(parsed);
        setIdx(0);
      } catch {
        if (!alive) return;
        setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (!items.length) return;
    timerRef.current = window.setInterval(() => {
      setIdx((p) => (items.length ? (p + 1) % items.length : 0));
    }, 4500);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [items.length]);

  if (!items.length) {
    if (variant === "backdrop") {
      return (
        <div
          className="absolute inset-0 bg-slate-400 dark:bg-slate-600"
          aria-hidden
        />
      );
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("精選作品", "精选作品", "Featured")}</div>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          {tr("目前沒有可顯示的精選照片。", "目前没有可显示的精选照片。", "No featured photos yet.")}
        </div>
      </div>
    );
  }

  const current = items[Math.min(idx, items.length - 1)]!;
  const href = `/photos/${encodeURIComponent(current.id)}`;
  const img = `/api/photos/${encodeURIComponent(current.id)}/image?variant=display`;
  const authorHref = `/users/${encodeURIComponent(current.author.id)}`;

  if (variant === "backdrop") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt=""
          className="h-full w-full scale-105 object-cover blur-[2px]"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-slate-900/45 dark:bg-sky-950/55" />
        {/* Attribution overlay — clickable to photo detail */}
        <Link
          href={href}
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 text-white"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-black/50 px-2 py-1 text-xs font-extrabold tracking-wider text-white">{current.registration}</span>
            <span className="rounded-lg bg-black/50 px-2 py-1 text-xs font-semibold text-white/90">{current.author.name}</span>
          </div>
          {current.title ? (
            <div className="mt-1 truncate text-sm font-semibold text-white/95">{current.title}</div>
          ) : null}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-end justify-between gap-3 px-2">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("精選作品", "精选作品", "Featured")}</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {tr("輪流播放（註冊號 + 拍攝者）", "轮流播放（注册号 + 拍摄者）", "Rotating (registration + author)")}
          </div>
        </div>
      </div>

      <Link href={href} className="group mt-3 block overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-sky-950/30">
        <div className="relative aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={current.title ?? current.registration}
            className="h-full w-full object-cover blur-[1px] transition duration-500 group-hover:scale-[1.02] group-hover:blur-0"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-black/45 px-2 py-1 text-xs font-extrabold tracking-wider text-white">{current.registration}</span>
              <Link
                href={authorHref}
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg bg-black/45 px-2 py-1 text-xs font-semibold text-white/95 hover:bg-black/55"
                title={current.author.name}
              >
                {current.author.name}
              </Link>
            </div>
            <div className="mt-2 truncate text-sm font-semibold text-white">
              {current.title ?? `${current.registration} · ${current.author.name}`}
            </div>
          </div>
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          {items.slice(0, 10).map((_, i) => {
            const active = i === idx;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={[
                  "h-2 w-2 rounded-full border",
                  active ? "border-sky-300 bg-sky-400" : "border-slate-300 bg-slate-200 dark:border-white/15 dark:bg-white/10",
                ].join(" ")}
                aria-label={tr("切換", "切换", "Switch")}
              />
            );
          })}
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-300">
          {idx + 1}/{items.length}
        </div>
      </div>
    </div>
  );
}

