"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Video {
  id: string;
  type: string;
  description: string;
  location: string;
  thumbnailPath: string | null;
  imagePathsJson: string | null;
  videoPath: string | null;
  aircraftInfoJson: string | null;
  viewCount: number;
  qualityScore: number;
  account: {
    id: string;
    nickname: string;
    avatarPath: string | null;
    user: { email: string };
  };
  createdAt: string;
  relatedPhoto?: {
    id: string;
    title: string | null;
    registration: string;
    airline: string;
    aircraftModel: string;
    shotAirport: string;
    shotAt: string;
  } | null;
}

export default function VideoReviewPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [qualityScore, setQualityScore] = useState(50);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const normalizeVideoAssetPath = (raw?: string | null) => {
    const s = String(raw || "").trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    const p = s.replaceAll("\\", "/");
    const m =
      p.match(/\/uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^\/?videos\/(.+)$/i);
    if (m?.[1]) return m[1];
    return p.split("/").filter(Boolean).pop() || null;
  };

  const toVideoAssetUrl = (raw?: string | null) => {
    const normalized = normalizeVideoAssetPath(raw);
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `/api/video/stream/${normalized}`;
  };

  // 加载待审核视频
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/video/review?status=pending");
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
        if (data.videos.length > 0 && !selectedVideo) {
          setSelectedVideo(data.videos[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (decision: "approved" | "rejected") => {
    if (!selectedVideo) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/video/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          decision,
          qualityScore,
        }),
      });
      const data = await res.json();

      if (data.success) {
        // 移除已审核的视频
        setVideos((prev) => prev.filter((v) => v.id !== selectedVideo.id));
        setSelectedVideo(null);
        // 加载下一个
        setTimeout(() => loadVideos(), 100);
      } else {
        alert(data.error || "操作失败");
      }
    } catch (error) {
      console.error("Review failed:", error);
      alert("操作失败");
    } finally {
      setProcessing(false);
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
    if (video.thumbnailPath) {
      return toVideoAssetUrl(video.thumbnailPath) || "/placeholder.svg";
    }
    const mediaUrl = getMediaUrl(video);
    return mediaUrl || "/placeholder.svg";
  };

  const parseAircraftInfo = (json: string | null) => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">视频审核</h1>
        <div className="flex gap-2">
          <Link href="/admin/video/tags" className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-700">
            管理标签
          </Link>
          <Link href="/admin/video/certification" className="rounded-lg bg-slate-200 px-4 py-2 dark:bg-slate-700">
            认证审核
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：视频列表 */}
        <div className="col-span-1 space-y-2">
          <h2 className="font-medium">待审核 ({videos.length})</h2>
          {videos.length === 0 ? (
            <p className="text-slate-500">暂无待审核视频</p>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${
                    selectedVideo?.id === video.id
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded">
                    {video.thumbnailPath ? (
                      <Image
                        src={getThumbnailUrl(video)}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-300">
                        <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{video.description || "无描述"}</p>
                    <p className="text-xs text-slate-500">{video.account.nickname}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 中间：视频预览 */}
        <div className="col-span-1">
          {selectedVideo ? (
            <div className="space-y-4">
              <h2 className="font-medium">预览</h2>
              <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
                {selectedVideo.type === "video" ? (
                  <video
                    src={getMediaUrl(selectedVideo) || undefined}
                    poster={getThumbnailUrl(selectedVideo)}
                    controls
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {(() => {
                      try {
                        const images = JSON.parse(selectedVideo.imagePathsJson || "[]");
                        return images.map((img: string, idx: number) => {
                          const src = toVideoAssetUrl(img);
                          if (!src) return null;
                          return (
                          <div key={idx} className="relative aspect-square">
                            <Image
                              src={src}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                          );
                        });
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <p className="text-slate-500">选择视频预览</p>
            </div>
          )}
        </div>

        {/* 右侧：审核操作 */}
        <div className="col-span-1 space-y-4">
          <h2 className="font-medium">审核</h2>
          {selectedVideo ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                <h3 className="font-medium">作者信息</h3>
                <p className="text-sm">{selectedVideo.account.nickname}</p>
                <p className="text-xs text-slate-500">{selectedVideo.account.user.email}</p>
              </div>

              <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                <h3 className="font-medium">视频信息</h3>
                <p className="text-sm">{selectedVideo.description || "无描述"}</p>
                <p className="mt-1 text-xs text-slate-500">📍 {selectedVideo.location || "未知地点"}</p>
                <p className="mt-1 text-xs text-slate-500">上传时间：{new Date(selectedVideo.createdAt).toLocaleString()}</p>
                {parseAircraftInfo(selectedVideo.aircraftInfoJson) && (
                  <div className="mt-2 text-xs text-slate-500">
                    {Object.entries(parseAircraftInfo(selectedVideo.aircraftInfoJson))
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <p key={k}>
                          {k}: {v as string}
                        </p>
                      ))}
                  </div>
                )}
                {selectedVideo.relatedPhoto ? (
                  <div className="mt-3 rounded-lg border border-slate-300/60 bg-white/60 p-2 text-xs dark:border-white/15 dark:bg-black/20">
                    <div className="mb-1 font-semibold">关联作品</div>
                    <div className="flex items-center gap-2">
                      <img src={`/api/photos/${encodeURIComponent(selectedVideo.relatedPhoto.id)}/image?variant=thumb`} alt="" className="h-14 w-20 rounded object-cover" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{selectedVideo.relatedPhoto.title || selectedVideo.relatedPhoto.registration}</div>
                        <div className="truncate text-slate-500">{selectedVideo.relatedPhoto.aircraftModel} · {selectedVideo.relatedPhoto.airline}</div>
                        <div className="truncate text-slate-500">{selectedVideo.relatedPhoto.shotAirport} · {selectedVideo.relatedPhoto.shotAt}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 质量评分 */}
              <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                <h3 className="font-medium">质量评分 (不影响用户)</h3>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={qualityScore}
                    onChange={(e) => setQualityScore(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold">{qualityScore}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">此评分仅用于系统推荐，不显示给用户</p>
              </div>

              {/* 审核按钮 */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview("approved")}
                  disabled={processing}
                  className="flex-1 rounded-lg bg-green-500 py-3 font-medium text-white hover:bg-green-600 disabled:opacity-50"
                >
                  通过
                </button>
                <button
                  onClick={() => handleReview("rejected")}
                  disabled={processing}
                  className="flex-1 rounded-lg bg-red-500 py-3 font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  拒绝
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <p className="text-slate-500">选择视频进行审核</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
