"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AppealDeleteButton({ appealId, locale, disabled }: { appealId: string; locale: "zh-Hant" | "zh-Hans" | "en"; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (disabled || loading) return;
    const ok = window.confirm(
      locale === "en"
        ? "Delete this appeal? This cannot be undone."
        : locale === "zh-Hans"
          ? "确定删除这条申诉？此操作不可恢复。"
          : "確定刪除這條申訴？此操作不可恢復。"
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appeals/${encodeURIComponent(appealId)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(json?.error || "delete_failed");
      router.refresh();
    } catch {
      // ignore (page refresh will reflect state if succeeded)
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-60"
    >
      {loading ? (locale === "en" ? "Deleting…" : locale === "zh-Hans" ? "删除中…" : "刪除中…") : locale === "en" ? "Delete" : locale === "zh-Hans" ? "删除" : "刪除"}
    </button>
  );
}

