"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReReviewAction({ photoId, variant }: { photoId: string; variant?: "button" | "link" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (loading) return;
    const reason = window.prompt("回溯二審原因（可選）", "") ?? "";
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/photos/${encodeURIComponent(photoId)}/rereview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      if (!res.ok) throw new Error(json.error || "操作失敗");
      router.push("/admin/photos");
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "操作失敗");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "link") {
    return (
      <button type="button" onClick={run} disabled={loading} className="text-xs font-semibold text-fuchsia-700 hover:underline disabled:opacity-60 dark:text-fuchsia-300">
        {loading ? "處理中…" : "發起回溯二審 →"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-800 hover:bg-fuchsia-500/15 disabled:opacity-60 dark:text-fuchsia-100"
    >
      {loading ? "處理中…" : "發起回溯二審"}
    </button>
  );
}

