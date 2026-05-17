"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ApprovedPhoto = {
  id: string;
  registration: string;
  aircraftModel: string;
  airline: string;
  shotAt: string;
};

export default function VideoUploadPage() {
  const router = useRouter();
  const [type, setType] = useState<"video" | "image">("video");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [isOriginal, setIsOriginal] = useState(true);
  const [originalConfirmed, setOriginalConfirmed] = useState(false);
  const [tags, setTags] = useState("");
  const [relatedPhotoId, setRelatedPhotoId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [approvedPhotos, setApprovedPhotos] = useState<ApprovedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/video/approved-photos");
        const data = await res.json();
        if (Array.isArray(data?.photos)) {
          setApprovedPhotos(data.photos);
        }
      } catch {
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!description.trim()) {
      setError("請填寫作品描述");
      return;
    }
    if (!originalConfirmed) {
      setError("請確認你擁有內容授權或原創權");
      return;
    }
    if (type === "video" && !videoFile) {
      setError("請選擇影片檔");
      return;
    }
    if (type === "image" && imageFiles.length === 0) {
      setError("請至少選擇一張圖片");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("description", description.trim());
      formData.set("location", location.trim());
      formData.set("visibility", visibility);
      formData.set("isOriginal", String(isOriginal));
      formData.set("originalConfirmed", String(originalConfirmed));
      formData.set(
        "tags",
        JSON.stringify(
          tags
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        )
      );
      formData.set(
        "aircraftInfo",
        JSON.stringify({
          relatedPhotoId: relatedPhotoId || null,
        })
      );

      if (thumbnailFile) {
        formData.set("thumbnail", thumbnailFile);
      }
      if (type === "video" && videoFile) {
        formData.set("video", videoFile);
      }
      if (type === "image") {
        imageFiles.forEach((file) => formData.append("images", file));
      }

      const res = await fetch("/api/video/videos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "上傳失敗");
      }
      router.push("/video");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="ui-panel-strong p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">上傳影片 / 圖文</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          補回可用的影片投稿入口，支援短影片與圖文作品。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-panel space-y-5 p-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">內容類型</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value === "image" ? "image" : "video")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60"
            >
              <option value="video">影片</option>
              <option value="image">圖文</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">可見性</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60"
            >
              <option value="public">公開</option>
              <option value="followers">僅關注者</option>
              <option value="private">私人</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-slate-900 dark:text-white">描述</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={300}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60"
            placeholder="例如：國泰航空 A350 夜降香港"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">拍攝地點</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60"
              placeholder="例如：HKG"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">標籤</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60"
              placeholder="A350, HKG, Cathay"
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-slate-900 dark:text-white">關聯已通過照片</span>
          <select
            value={relatedPhotoId}
            onChange={(e) => setRelatedPhotoId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/60"
          >
            <option value="">不關聯</option>
            {approvedPhotos.map((photo) => (
              <option key={photo.id} value={photo.id}>
                {photo.registration} · {photo.aircraftModel} · {photo.airline}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          {type === "video" ? (
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">影片檔</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="block w-full"
              />
            </label>
          ) : (
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">圖片檔</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={(e) => setImageFiles(Array.from(e.target.files || []).slice(0, 9))}
                className="block w-full"
              />
            </label>
          )}

          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">封面（可選）</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              className="block w-full"
            />
          </label>
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isOriginal} onChange={(e) => setIsOriginal(e.target.checked)} />
            <span>原創內容</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={originalConfirmed}
              onChange={(e) => setOriginalConfirmed(e.target.checked)}
            />
            <span>我確認此內容可合法發佈並接受站內審核</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {submitting ? "上傳中..." : "提交作品"}
          </button>
        </div>
      </form>
    </div>
  );
}
