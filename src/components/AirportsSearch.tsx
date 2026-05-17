"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/i18n/t";
import { useClientLocale } from "@/i18n/client-locale";

type SearchItem = {
  code: string;
  iata: string | null;
  icao: string | null;
  nameZh: string;
  nameEn: string;
  region: string;
  airportPage: string;
};

type SearchResponse = {
  query: string;
  results: SearchItem[];
};

export function AirportsSearch() {
  const router = useRouter();
  const locale = useClientLocale();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports?query=${encodeURIComponent(query)}&limit=8`, {
          signal: ac.signal,
        });
        const json = (await res.json()) as SearchResponse;
        setItems(Array.isArray(json.results) ? json.results : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => window.clearTimeout(handle);
  }, [q]);

  const placeholder = useMemo(() => {
    // reuse a close enough key if airports keys not present yet
    const fallback = "搜尋 IATA/ICAO/機場名稱…";
    try {
      return (t(locale, "models.search.placeholder") as string) || fallback;
    } catch {
      return fallback;
    }
  }, [locale]);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="hidden text-xs font-semibold text-slate-200 md:block">機場搜尋</div>
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-white/10 bg-sky-950/50 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400/40"
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-slate-300">
            {loading ? <Spinner /> : <SearchIcon />}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setQ("");
            setItems([]);
            setOpen(false);
          }}
          className="rounded-xl border border-white/10 bg-sky-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-sky-950/40"
        >
          清除
        </button>
      </div>

      {open && q.trim() ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-2xl border border-white/10 bg-sky-950/95 shadow-2xl backdrop-blur">
          {items.length ? (
            <div className="max-h-[360px] overflow-auto p-2">
              {items.map((it) => (
                <button
                  key={`${it.code}-${it.iata ?? ""}-${it.icao ?? ""}`}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(it.airportPage);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left hover:border-white/10 hover:bg-white/5"
                >
                  <div className="grid h-10 w-14 place-items-center overflow-hidden rounded-lg border border-white/10 bg-sky-950/40">
                    <div className="text-xs font-extrabold tracking-wider text-sky-200">{it.code}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{it.nameZh}</div>
                    <div className="mt-1 truncate text-xs text-slate-300">
                      {it.nameEn} · {it.region}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-sky-300">↵</div>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="p-4 text-sm text-slate-200">搜尋中…</div>
          ) : (
            <div className="p-4 text-sm text-slate-200">沒有結果</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M9 15.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.5 14.5 18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="animate-spin">
      <path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

