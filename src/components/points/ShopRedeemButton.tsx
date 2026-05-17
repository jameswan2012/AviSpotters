"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ShopRedeemButton({
  itemId,
  disabled,
  loginRequired = false,
}: {
  itemId: string;
  disabled?: boolean;
  loginRequired?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    if (disabled || busy) return;
    if (loginRequired) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shop/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        const error = String(json.error || "redeem_failed");
        if (error === "insufficient_points") throw new Error("積分不足");
        if (error === "out_of_stock") throw new Error("已無庫存");
        if (error === "virtual_stock_empty") throw new Error("虛擬內容庫存不足");
        throw new Error(error);
      }
      setMessage("兌換成功，已加入我的獎勵。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "兌換失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={disabled || busy}
        className="w-full rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loginRequired ? "登入後兌換" : busy ? "兌換中…" : "立即兌換"}
      </button>
      {message ? <div className="text-xs text-slate-600 dark:text-slate-300">{message}</div> : null}
    </div>
  );
}
