"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Video {
  id: string;
  type: "video" | "image";
  description: string;
  location: string;
  thumbnailPath?: string;
  videoPath?: string;
  imagePathsJson?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  account: {
    id: string;
    nickname: string;
    avatarPath?: string;
    avatarMime?: string;
    certificationStatus: string;
    certificationScore: number;
  };
  createdAt?: string;
  relatedPhoto?: {
    id: string;
    title: string | null;
    registration: string;
    airline: string;
    aircraftModel: string;
    shotAirport: string;
    shotAt: string;
  } | null;
  isLiked?: boolean;
  isFollowing?: boolean;
}

interface VideoFeedProps {
  initialVideos: Video[];
  initialCursor?: string;
  locale?: "zh-Hant" | "zh-Hans" | "en";
}

export default function VideoFeed({ initialVideos, initialCursor, locale = "zh-Hans" }: VideoFeedProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [cursor, setCursor] = useState<string | null>(initialCursor || null);
  const [loading, setLoading] = useState(false);
  const [recommendingIds, setRecommendingIds] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const normalizeVideoAssetPath = (raw?: string | null) => {
    const s = String(raw || "").trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    const p = s.replaceAll("\\", "/");
    const m =
      p.match(/\/public\/uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/\/uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^\/?videos\/(.+)$/i) ||
      p.match(/^\/?uploads\/(.+)$/i);
    if (m?.[1]) return m[1];
    return p.split("/").filter(Boolean).pop() || null;
  };

  const encodeUrlPath = (input: string) =>
    input
      .split("/")
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join("/");

  const toVideoAssetUrl = (raw?: string | null) => {
    const normalized = normalizeVideoAssetPath(raw);
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `/api/video/stream/${encodeUrlPath(normalized)}`;
  };

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("cursor", cursor);
      params.set("limit", "10");

      const res = await fetch(`/api/video/videos?${params}`);
      const data = await res.json();

      if (data.videos) {
        setVideos((prev) => [...prev, ...data.videos]);
        setCursor(data.nextCursor || null);
      }
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loading && cursor) {
            loadMore();
          }
        });
      },
      { threshold: 0.5 }
    );

    const lastVideo = containerRef.current?.lastElementChild;
    if (lastVideo) {
      observer.observe(lastVideo);
    }

    return () => observer.disconnect();
  }, [loadMore, loading, cursor]);

  const handleLike = async (videoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const current = videos.find((v) => v.id === videoId);
    if (!current || current.isLiked || recommendingIds[videoId]) return;
    setRecommendingIds((prev) => ({ ...prev, [videoId]: true }));

    try {
      const res = await fetch(`/api/video/videos/${videoId}/like`, { method: "POST" });
      const data = await res.json();

      if (data.success !== false) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  isLiked: !!data.liked,
                  likeCount: typeof data.likeCount === "number" ? data.likeCount : v.likeCount,
                }
              : v
          )
        );
      }
    } catch (error) {
      console.error("Failed to like:", error);
    } finally {
      setRecommendingIds((prev) => ({ ...prev, [videoId]: false }));
    }
  };

  const handleComment = (videoId: string) => {
    router.push(`/video/${videoId}?comment=true`);
  };

  const handleShare = (videoId: string) => {
    router.push(`/video/${videoId}?share=true`);
  };

  const handleFollow = async (accountId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch("/api/video/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAccountId: accountId }),
      });
      const data = await res.json();

      if (data.success !== false) {
        setVideos((prev) =>
          prev.map((v) =>
            v.account.id === accountId ? { ...v, isFollowing: data.following } : v
          )
        );
      }
    } catch (error) {
      console.error("Failed to follow:", error);
    }
  };

  const getMediaUrl = (video: Video) => {
    if (video.type === "video") {
      return toVideoAssetUrl(video.videoPath);
    } else {
      try {
        const images = JSON.parse(video.imagePathsJson || "[]");
        return images.length > 0 ? toVideoAssetUrl(images[0]) : null;
      } catch {
        return null;
      }
    }
  };

  const getThumbnailUrl = (video: Video) => {
    if (video.thumbnailPath) return toVideoAssetUrl(video.thumbnailPath) || undefined;
    return getMediaUrl(video) || undefined;
  };

  const getAvatarUrl = (account: Video["account"]) => {
    if (account.avatarPath) return `/uploads/${account.avatarPath}`;
    return null;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toString();
  };

  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);

  if (videos.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
          <svg className="h-12 w-12 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-lg text-slate-700 dark:text-slate-200">{tr("暫無影片內容", "暂无视频内容", "No videos yet")}</p>
        <Link href="/video/upload" className="ui-btn-primary mt-4">
          {tr("上傳第一個影片", "上传第一个视频", "Upload your first video")}
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4 pb-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video) => (
          <div key={video.id} className="ui-panel overflow-hidden border border-slate-200/70 bg-gradient-to-br from-white/95 via-white to-sky-50/45 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/70 dark:via-slate-900/50 dark:to-sky-950/20">
            <Link href={`/video/${video.id}`} className="group block">
              <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100 dark:border-white/10 dark:bg-black/20">
                {video.type === "video" ? (
                  <video
                    src={getMediaUrl(video) || undefined}
                    poster={getThumbnailUrl(video)}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    preload="metadata"
                    playsInline
                    muted
                    loop
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                ) : (
                  <Image
                    src={getMediaUrl(video) || "/placeholder.svg"}
                    alt={video.description || "video"}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                )}
                <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                  {video.type === "video" ? tr("影片", "视频", "VIDEO") : tr("圖文", "图文", "PHOTO")}
                </div>
                <div className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                  {formatCount(video.viewCount)} {tr("次觀看", "次观看", "views")}
                </div>
              </div>
            </Link>

            <div className="mt-3 min-w-0">
              <Link href={`/video/${video.id}`} className="block">
                <h3 className="line-clamp-2 text-sm font-bold text-slate-900 hover:text-rose-600 dark:text-white dark:hover:text-rose-300">
                  {video.description || tr("未命名影片", "未命名视频", "Untitled video")}
                </h3>
              </Link>

              <div className="mt-2 flex items-center gap-2">
                <Link href={`/video/account/${video.account.id}`} className="flex min-w-0 items-center gap-2">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200 dark:border-white/10">
                    {getAvatarUrl(video.account) ? (
                      <Image src={getAvatarUrl(video.account)!} alt={video.account.nickname} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white">
                        {video.account.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{video.account.nickname}</span>
                </Link>
                {!video.isFollowing ? (
                  <button
                    onClick={(e) => handleFollow(video.account.id, e)}
                    className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                  >
                    + {tr("關注", "关注", "Follow")}
                  </button>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <span>{formatCount(video.viewCount)} {tr("次觀看", "次观看", "views")}</span>
                {video.createdAt ? <span>· {new Date(video.createdAt).toLocaleDateString()}</span> : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={(e) => handleLike(video.id, e)}
                  disabled={!!video.isLiked || !!recommendingIds[video.id]}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm disabled:opacity-60 ${
                    video.isLiked
                      ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-700 dark:border-emerald-300/20 dark:text-emerald-300"
                      : "border-slate-200/70 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  ❤ {formatCount(video.likeCount)}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleComment(video.id);
                  }}
                  className="rounded-full border border-slate-200/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  💬 {formatCount(video.commentCount)}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShare(video.id);
                  }}
                  className="rounded-full border border-slate-200/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  ↗ {formatCount(video.shareCount)}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
        </div>
      )}

      {!loading && cursor && (
        <div className="flex justify-center py-4">
          <button onClick={loadMore} className="ui-btn-muted">
            {tr("載入更多", "加载更多", "Load more")}
          </button>
        </div>
      )}

      {!cursor && videos.length > 0 && (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">{tr("沒有更多了", "没有更多了", "No more videos")}</div>
      )}
    </div>
  );
}
