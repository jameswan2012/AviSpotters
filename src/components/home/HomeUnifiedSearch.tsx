"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Locale = "zh-Hant" | "zh-Hans" | "en";

type SearchPayload = {
  ok: boolean;
  blocked: boolean;
  query: string;
  level?: "low" | "high";
  matches?: string[];
  users?: Array<{ id: string; name: string; roleId: number; avatarPath: string | null }>;
  photos?: Array<{
    id: string;
    title: string;
    registration: string;
    shotAirport: string;
    aircraftModel: string;
    airline: string;
    authorName: string;
  }>;
  videos?: Array<{
    id: string;
    type: "video" | "image";
    description: string;
    location: string;
    thumbnailPath: string | null;
    accountId: string;
    accountName: string;
    createdAt: string;
  }>;
  totals?: { users: number; photos: number; videos: number };
};

function tr(locale: Locale, zhHant: string, zhHans: string, en: string) {
  return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
}

export function HomeUnifiedSearch({ locale }: { locale: Locale }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchPayload | null>(null);

  const placeholder = useMemo(
    () =>
      tr(
        locale,
        "搜尋：使用者 / 照片 / 影片 / 機型 / 機場 / 註冊號 / 航空公司",
        "搜索：用户 / 照片 / 视频 / 机型 / 机场 / 注册号 / 航空公司",
        "Search users, photos, videos, model, airport, registration, airline"
      ),
    [locale]
  );

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search/home?q=${encodeURIComponent(query)}`);
        const json = (await res.json()) as SearchPayload;
        if (!alive) return;
        setData(json);
      } catch {
        if (!alive) return;
        setData({
          ok: false,
          blocked: false,
          query,
          users: [],
          photos: [],
          videos: [],
          totals: { users: 0, photos: 0, videos: 0 },
        });
      } finally {
        if (alive) setLoading(false);
      }
    }, 260);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  const users = data?.users ?? [];
  const photos = data?.photos ?? [];
  const videos = data?.videos ?? [];

  return (
    <section className="liquid-glass mt-6 rounded-2xl border border-white/70 p-4 md:p-5 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {tr(locale, "全站搜尋", "全站搜索", "Global Search")}
        </h2>
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {tr(locale, "排序固定：用戶 → 照片 → 影片", "排序固定：用户 → 照片 → 视频", "Fixed order: Users → Photos → Videos")}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
        />
      </div>

      {loading ? (
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          {tr(locale, "搜尋中…", "搜索中…", "Searching...")}
        </div>
      ) : null}

      {data?.blocked ? (
        <div className="mt-4 rounded-2xl border border-red-300/50 bg-gradient-to-br from-red-700 via-red-800 to-red-900 p-5 text-white shadow-[0_22px_50px_rgba(127,29,29,0.45)]">
          <div className="text-base font-extrabold tracking-wide">
            {tr(locale, "敏感詞警告", "敏感词警告", "Sensitive Content Warning")}
          </div>
          <div className="mt-2 text-sm text-red-100">
            {tr(
              locale,
              "你的關鍵字命中敏感詞庫，已停止搜尋並觸發安全警告。",
              "你的关键词命中敏感词库，已停止搜索并触发安全警告。",
              "Your query matched the sensitive lexicon. Search was blocked."
            )}
          </div>
          <div className="mt-2 text-xs text-red-100/90">
            {tr(locale, "命中詞：", "命中词：", "Matched terms: ")}
            {(data.matches || []).slice(0, 8).join(", ")}
          </div>
        </div>
      ) : null}

      {q.trim() && data && !data.blocked ? (
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {tr(locale, "第 1 行：用戶", "第 1 行：用户", "Row 1: Users")} ({data.totals?.users ?? users.length})
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {users.length ? (
                users.map((u) => (
                  <Link key={u.id} href={`/users/${u.id}`} className="rounded-xl border border-slate-200 bg-white/85 p-3 text-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                  </Link>
                ))
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr(locale, "無符合用戶", "无匹配用户", "No matched users")}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {tr(locale, "第 2 行：照片", "第 2 行：照片", "Row 2: Photos")} ({data.totals?.photos ?? photos.length})
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {photos.length ? (
                photos.map((p) => (
                  <Link key={p.id} href={`/photos/${p.id}`} className="rounded-xl border border-slate-200 bg-white/85 p-3 text-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <div className="truncate font-semibold text-slate-900 dark:text-white">{p.title}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {p.registration} · {p.aircraftModel}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{p.shotAirport} · {p.airline}</div>
                  </Link>
                ))
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr(locale, "無符合照片", "无匹配照片", "No matched photos")}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {tr(locale, "第 3 行：影片", "第 3 行：视频", "Row 3: Videos")} ({data.totals?.videos ?? videos.length})
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {videos.length ? (
                videos.map((v) => (
                  <Link key={v.id} href={`/video/${v.id}`} className="rounded-xl border border-slate-200 bg-white/85 p-3 text-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <div className="truncate font-semibold text-slate-900 dark:text-white">
                      {v.description || tr(locale, "未命名影片", "未命名视频", "Untitled video")}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{v.accountName}</div>
                    <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{v.location || "-"}</div>
                  </Link>
                ))
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr(locale, "無符合影片", "无匹配视频", "No matched videos")}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
