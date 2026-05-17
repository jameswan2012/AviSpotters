"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type VideoItem = {
  id: string;
  type: "video" | "image";
  description: string | null;
  status: "pending" | "approved" | "rejected";
  location: string | null;
  thumbnailPath: string | null;
  imagePathsJson: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  favoriteCount: number;
  qualityScore: number;
  createdAt: string;
  publishedAt: string | null;
  canModify: boolean;
};

type Totals = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
};

export default function VideoManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [editing, setEditing] = useState<VideoItem | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnail, setEditThumbnail] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const toVideoAssetUrl = (raw?: string | null) => {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    const p = s.replaceAll("\\", "/");
    const m =
      p.match(/\/uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^uploads\/(?:uploads\/)?videos\/(.+)$/i) ||
      p.match(/^\/?videos\/(.+)$/i);
    const normalized = m?.[1] || p.split("/").filter(Boolean).pop();
    return normalized ? `/api/video/stream/${normalized}` : "";
  };

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/video/my-videos");
      const data = (await res.json()) as { error?: string; videos?: VideoItem[]; totals?: Totals };
      if (!res.ok) throw new Error(data.error || "加载失败");
      setVideos(data.videos || []);
      setTotals(data.totals || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const statusLabel = (s: VideoItem["status"]) =>
    s === "approved" ? "已通过" : s === "pending" ? "待审核" : "已拒绝";

  const statusClass = (s: VideoItem["status"]) =>
    s === "approved"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : s === "pending"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-red-500/15 text-red-700 dark:text-red-300";

  const previewFor = (v: VideoItem) => {
    if (v.thumbnailPath) return toVideoAssetUrl(v.thumbnailPath);
    if (v.type === "image") {
      try {
        const imgs = JSON.parse(v.imagePathsJson || "[]") as string[];
        if (imgs[0]) return toVideoAssetUrl(imgs[0]);
      } catch {
        // ignore
      }
    }
    return "";
  };

  async function onDelete(videoId: string) {
    if (!confirm("确定删除该作品吗？")) return;
    try {
      const res = await fetch(`/api/video/videos/${videoId}`, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "删除失败");
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("description", editDescription);
      if (editThumbnail) fd.set("thumbnail", editThumbnail);
      const res = await fetch(`/api/video/videos/${editing.id}`, { method: "PUT", body: fd });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "保存失败");
      setEditing(null);
      setEditThumbnail(null);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const cards = useMemo(() => {
    if (!totals) return [];
    return [
      { label: "总作品", value: totals.total },
      { label: "待审核", value: totals.pending },
      { label: "已通过", value: totals.approved },
      { label: "已拒绝", value: totals.rejected },
      { label: "总播放", value: totals.views },
      { label: "总点赞", value: totals.likes },
      { label: "总评论", value: totals.comments },
      { label: "总分享", value: totals.shares },
    ];
  }, [totals]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">个人作品管理面板</h1>
          <div className="flex gap-2">
            <Link href="/video/upload" className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400">上传新作品</Link>
            <Link href="/video" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">返回视频页</Link>
          </div>
        </div>

        {error ? <div className="rounded-lg bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div> : null}

        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <div className="border-b border-slate-200 p-3 text-sm font-semibold dark:border-white/10">我的作品</div>
          {videos.length === 0 ? (
            <div className="p-8 text-center text-slate-500">还没有作品</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {videos.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="h-20 w-28 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
                    {previewFor(v) ? <img src={previewFor(v)} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-medium text-slate-900 dark:text-white">{v.description || "无标题"}</div>
                    <div className="mt-1 text-xs text-slate-500">上传：{new Date(v.createdAt).toLocaleString()}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>播放 {v.viewCount}</span>
                      <span>点赞 {v.likeCount}</span>
                      <span>评论 {v.commentCount}</span>
                      <span>分享 {v.shareCount}</span>
                      <span>收藏 {v.favoriteCount}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(v.status)}`}>{statusLabel(v.status)}</span>
                  <div className="flex gap-2">
                    <Link href={`/video/${v.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600">查看</Link>
                    {v.canModify ? (
                      <button
                        onClick={() => {
                          setEditing(v);
                          setEditDescription(v.description || "");
                          setEditThumbnail(null);
                        }}
                        className="rounded-lg border border-sky-300 px-3 py-1.5 text-sm text-sky-700 dark:border-sky-700 dark:text-sky-300"
                      >
                        修改封面/文案
                      </button>
                    ) : (
                      <span className="self-center text-xs text-slate-400">不可再修改</span>
                    )}
                    <button onClick={() => void onDelete(v.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 dark:border-red-700">
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 dark:bg-slate-900">
            <div className="text-base font-semibold">修改作品（最多一次）</div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm font-medium">文案</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800" />
              </div>
              <div>
                <label className="text-sm font-medium">封面（JPG/PNG，最大5MB）</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="mt-1 block w-full"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f && f.size > 5 * 1024 * 1024) {
                      alert("封面不能超过 5MB");
                      return;
                    }
                    setEditThumbnail(f);
                  }}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500">取消</button>
              <button onClick={() => void onSaveEdit()} disabled={saving} className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

