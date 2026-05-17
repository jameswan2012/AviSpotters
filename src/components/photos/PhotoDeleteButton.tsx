"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PhotoDeleteButton({
  photoId,
  locale,
  disabled,
}: {
  photoId: string;
  locale: "zh-Hant" | "zh-Hans" | "en";
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function doDelete(opts?: { skipConfirm?: boolean }) {
    if (disabled || loading) return;
    if (!opts?.skipConfirm) {
      const ok = window.confirm(
        locale === "en"
          ? "Delete this photo? This cannot be undone."
          : locale === "zh-Hans"
            ? "确定删除这张图片？此操作不可恢复。"
            : "確定刪除這張圖片？此操作不可恢復。"
      );
      if (!ok) return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(photoId)}/delete`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        if (res.status === 403 && json?.error === "rejected_not_deletable") {
          // keep silent UI (policy: rejected photos cannot be manually deleted)
          return;
        }
        throw new Error(json?.error || "delete_failed");
      }
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void doDelete()}
        disabled={disabled || loading}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-60"
      >
        {loading ? (locale === "en" ? "Deleting…" : locale === "zh-Hans" ? "删除中…" : "刪除中…") : locale === "en" ? "Delete" : locale === "zh-Hans" ? "删除" : "刪除"}
      </button>
    </>
  );
}

