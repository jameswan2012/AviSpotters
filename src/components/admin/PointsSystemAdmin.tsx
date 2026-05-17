"use client";

import { useEffect, useMemo, useState } from "react";

type RewardItem = { id: string; name: string };
type CouponTemplate = { id: string; name: string };
type PrizeForm = {
  id?: string;
  name: string;
  description: string;
  probabilityPercent: string;
  stock: string;
  rewardType: "item" | "coupon" | "points" | "none" | "custom";
  rewardItemId: string;
  couponTemplateId: string;
  couponQuantity: string;
};
type WheelForm = {
  id?: string;
  name: string;
  description: string;
  backgroundStyle: string;
  usePoints: boolean;
  spinCostPoints: string;
  spinDurationMs: string;
  useCoupon: boolean;
  couponTemplateId: string;
  active: boolean;
  prizes: PrizeForm[];
};

function emptyPrize(): PrizeForm {
  return {
    name: "",
    description: "",
    probabilityPercent: "1",
    stock: "1",
    rewardType: "none",
    rewardItemId: "",
    couponTemplateId: "",
    couponQuantity: "1",
  };
}

function emptyWheel(): WheelForm {
  return {
    name: "",
    description: "",
    backgroundStyle: "cloud-blue",
    usePoints: true,
    spinCostPoints: "0",
    spinDurationMs: "3600",
    useCoupon: false,
    couponTemplateId: "",
    active: true,
    prizes: [emptyPrize()],
  };
}

export function PointsSystemAdmin({ canEdit }: { canEdit: boolean }) {
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [couponTemplates, setCouponTemplates] = useState<CouponTemplate[]>([]);
  const [wheels, setWheels] = useState<WheelForm[]>([]);
  const [current, setCurrent] = useState<WheelForm>(emptyWheel());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/points-system");
    const json = await res.json();
    setRewardItems(json.rewardItems || []);
    setCouponTemplates(json.couponTemplates || []);
    setWheels(
      (json.wheels || []).map((wheel: any) => ({
        id: wheel.id,
        name: wheel.name || "",
        description: wheel.description || "",
        backgroundStyle: wheel.backgroundStyle || "cloud-blue",
        usePoints: !!wheel.usePoints,
        spinCostPoints: String(wheel.spinCostPoints ?? 0),
        spinDurationMs: String(wheel.spinDurationMs ?? 3600),
        useCoupon: !!wheel.useCoupon,
        couponTemplateId: wheel.couponTemplateId || "",
        active: wheel.active !== false,
        prizes: (wheel.prizes || []).map((prize: any) => ({
          id: prize.id,
          name: prize.name || "",
          description: prize.description || "",
          probabilityPercent: String(((Number(prize.probabilityWeight) || 0) / 1000).toFixed(3).replace(/\.?0+$/, "")),
          stock: String(prize.stock ?? 0),
          rewardType: prize.rewardType || "none",
          rewardItemId: prize.rewardItemId || "",
          couponTemplateId: prize.couponTemplateId || "",
          couponQuantity: String(prize.couponQuantity ?? 1),
        })),
      }))
    );
  }

  useEffect(() => {
    load().catch(() => setStatus("讀取失敗"));
  }, []);

  const totalProbability = useMemo(
    () => current.prizes.reduce((sum, prize) => sum + (Number(prize.probabilityPercent) || 0), 0),
    [current.prizes]
  );

  function updatePrize(index: number, patch: Partial<PrizeForm>) {
    setCurrent((prev) => ({
      ...prev,
      prizes: prev.prizes.map((prize, i) => (i === index ? { ...prize, ...patch } : prize)),
    }));
  }

  async function saveWheel() {
    setBusy(true);
    setStatus("");
    try {
      const method = current.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/points-system", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wheel: current }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "save_failed");
      setStatus("已保存");
      await load();
      if (json?.wheel) {
        const next = {
          ...current,
          id: json.wheel.id,
        };
        setCurrent(next);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function deleteWheel(id?: string) {
    if (!id) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/points-system", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wheelId: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "delete_failed");
      setCurrent(emptyWheel());
      setStatus("已刪除");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-100">轉盤列表</div>
          <button
            type="button"
            onClick={() => setCurrent(emptyWheel())}
            className="rounded-xl bg-sky-400 px-3 py-1.5 text-xs font-semibold text-sky-950"
          >
            新增
          </button>
        </div>
        <div className="space-y-2">
          {wheels.map((wheel) => (
            <button
              key={wheel.id}
              type="button"
              onClick={() => setCurrent(wheel)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
            >
              <div className="font-semibold text-white">{wheel.name || "未命名轉盤"}</div>
              <div className="mt-1 text-xs text-slate-400">{wheel.prizes.length} 個獎品</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-200">
            <span>轉盤名稱</span>
            <input value={current.name} onChange={(e) => setCurrent({ ...current, name: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-slate-200">
            <span>每次積分消耗</span>
            <input value={current.spinCostPoints} onChange={(e) => setCurrent({ ...current, spinCostPoints: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
          </label>
        </div>

        <label className="block space-y-2 text-sm text-slate-200">
          <span>描述</span>
          <textarea value={current.description} onChange={(e) => setCurrent({ ...current, description: e.target.value })} className="min-h-[84px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-200">
            <span>背景樣式</span>
            <select value={current.backgroundStyle} onChange={(e) => setCurrent({ ...current, backgroundStyle: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white">
              <option value="cloud-blue">雲朵藍白</option>
              <option value="cloud-gold">雲朵金白</option>
              <option value="night-slate">深色星夜</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-200">
            <span>旋轉時長（毫秒）</span>
            <input value={current.spinDurationMs} onChange={(e) => setCurrent({ ...current, spinDurationMs: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
            <input type="checkbox" checked={current.usePoints} onChange={(e) => setCurrent({ ...current, usePoints: e.target.checked })} />
            積分抽
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
            <input type="checkbox" checked={current.useCoupon} onChange={(e) => setCurrent({ ...current, useCoupon: e.target.checked })} />
            抽獎券抽
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
            <input type="checkbox" checked={current.active} onChange={(e) => setCurrent({ ...current, active: e.target.checked })} />
            啟用
          </label>
        </div>

        {current.useCoupon ? (
          <label className="space-y-2 text-sm text-slate-200">
            <span>抽獎券模板</span>
            <select value={current.couponTemplateId} onChange={(e) => setCurrent({ ...current, couponTemplateId: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white">
              <option value="">請選擇</option>
              {couponTemplates.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">獎品</div>
              <div className="mt-1 text-xs text-slate-400">機率直接填百分比，可填 0.5、12.75 這類小數。</div>
            </div>
            <button type="button" onClick={() => setCurrent({ ...current, prizes: [...current.prizes, emptyPrize()] })} className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
              新增獎品
            </button>
          </div>

          <div className="space-y-4">
            {current.prizes.map((prize, index) => (
              <div key={prize.id || index} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-semibold text-slate-100">獎品 {index + 1}</div>
                  <button
                    type="button"
                    onClick={() => setCurrent({ ...current, prizes: current.prizes.filter((_, i) => i !== index) })}
                    className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-200"
                  >
                    刪除
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input value={prize.name} onChange={(e) => updatePrize(index, { name: e.target.value })} placeholder="名稱" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                  <input value={prize.probabilityPercent} onChange={(e) => updatePrize(index, { probabilityPercent: e.target.value })} placeholder="機率 %" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                  <input value={prize.stock} onChange={(e) => updatePrize(index, { stock: e.target.value })} placeholder="庫存" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                  <select value={prize.rewardType} onChange={(e) => updatePrize(index, { rewardType: e.target.value as PrizeForm["rewardType"] })} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                    <option value="none">謝謝惠顧</option>
                    <option value="points">積分</option>
                    <option value="item">商品</option>
                    <option value="coupon">抽獎券</option>
                    <option value="custom">獨立獎品</option>
                  </select>
                </div>

                <textarea value={prize.description} onChange={(e) => updatePrize(index, { description: e.target.value })} placeholder="說明" className="mt-3 min-h-[72px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />

                {prize.rewardType === "item" || prize.rewardType === "custom" ? (
                  <select value={prize.rewardItemId} onChange={(e) => updatePrize(index, { rewardItemId: e.target.value })} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                    <option value="">選擇商品</option>
                    {rewardItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : null}

                {prize.rewardType === "coupon" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <select value={prize.couponTemplateId} onChange={(e) => updatePrize(index, { couponTemplateId: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                      <option value="">選擇抽獎券模板</option>
                      {couponTemplates.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          {coupon.name}
                        </option>
                      ))}
                    </select>
                    <input value={prize.couponQuantity} onChange={(e) => updatePrize(index, { couponQuantity: e.target.value })} placeholder="數量" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                  </div>
                ) : null}

                {prize.rewardType === "points" ? (
                  <input value={prize.couponQuantity} onChange={(e) => updatePrize(index, { couponQuantity: e.target.value })} placeholder="積分數量" className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-300">
            總機率 {totalProbability.toFixed(3).replace(/\.?0+$/, "")}%
            {totalProbability !== 100 ? <span className="ml-2 text-amber-300">建議合計 100%</span> : null}
          </div>
          <div className="flex gap-3">
            {current.id ? (
              <button type="button" onClick={() => deleteWheel(current.id)} disabled={!canEdit || busy} className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-100 disabled:opacity-50">
                刪除
              </button>
            ) : null}
            <button type="button" onClick={saveWheel} disabled={!canEdit || busy} className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-sky-950 disabled:opacity-50">
              {busy ? "保存中..." : "保存轉盤"}
            </button>
          </div>
        </div>
        {status ? <div className="text-sm text-slate-300">{status}</div> : null}
      </div>
    </div>
  );
}
