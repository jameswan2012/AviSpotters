"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Locale = "zh-Hant" | "zh-Hans" | "en";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  imageUpdatedAt: string | Date | null;
  probabilityWeight: number;
  stock: number;
  rewardType: string;
  rewardItemId: string | null;
  couponTemplateId: string | null;
  couponQuantity: number | null;
  rewardItem: {
    id: string;
    name: string;
    description: string | null;
    itemType: string;
    virtualType: string | null;
    imagePath: string | null;
    imageUpdatedAt: string | Date | null;
  } | null;
  couponTemplate: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

type Wheel = {
  id: string;
  name: string;
  description: string | null;
  backgroundStyle?: string | null;
  usePoints: boolean;
  spinCostPoints: number;
  spinDurationMs?: number | null;
  useCoupon: boolean;
  couponTemplate: { id: string; name: string } | null;
  prizes: Prize[];
};

function prizeDisplayName(prize: Prize, tr: (a: string, b: string, c: string) => string) {
  if (prize.rewardType === "item") return prize.rewardItem?.name ?? prize.name;
  if (prize.rewardType === "coupon") return prize.couponTemplate?.name ?? prize.name;
  if (prize.rewardType === "points") return `${prize.couponQuantity ?? 0}${tr(" 積分", " 积分", " pts")}`;
  if (prize.rewardType === "none") return tr("謝謝惠顧", "谢谢惠顾", "Thanks");
  return prize.name;
}

function prizeDescription(prize: Prize, tr: (a: string, b: string, c: string) => string) {
  if (prize.rewardType === "item") return prize.rewardItem?.description ?? prize.description;
  if (prize.rewardType === "coupon") return prize.couponTemplate?.description ?? prize.description;
  if (prize.rewardType === "points") return tr("抽中後直接加到帳戶積分。", "抽中后直接加到账户积分。", "Adds points directly to the account.");
  if (prize.rewardType === "none") return tr("未抽中任何獎品。", "未抽中任何奖品。", "No prize this time.");
  return prize.description;
}

function prizeImageUrl(prize: Prize) {
  if (prize.imagePath) {
    const version = prize.imageUpdatedAt ? new Date(prize.imageUpdatedAt).getTime() : 0;
    return `/api/lottery/prizes/${encodeURIComponent(prize.id)}/image?v=${version}`;
  }
  if (prize.rewardItem?.imagePath) {
    const version = prize.rewardItem.imageUpdatedAt ? new Date(prize.rewardItem.imageUpdatedAt).getTime() : 0;
    return `/api/rewards/items/${encodeURIComponent(prize.rewardItem.id)}/image?v=${version}`;
  }
  return null;
}

function formatProbability(weight: number) {
  return `${(Math.max(0, Number(weight) || 0) / 1000).toFixed(3).replace(/\.?0+$/, "")}%`;
}

function framePositions(count: number) {
  const slots10 = [
    { left: "16%", top: "18%" },
    { left: "35%", top: "18%" },
    { left: "54%", top: "18%" },
    { left: "73%", top: "18%" },
    { left: "16%", top: "40%" },
    { left: "73%", top: "40%" },
    { left: "16%", top: "72%" },
    { left: "35%", top: "72%" },
    { left: "54%", top: "72%" },
    { left: "73%", top: "72%" },
  ];
  const slots12 = [
    { left: "12%", top: "12%" },
    { left: "31%", top: "12%" },
    { left: "50%", top: "12%" },
    { left: "69%", top: "12%" },
    { left: "88%", top: "12%" },
    { left: "12%", top: "40%" },
    { left: "88%", top: "40%" },
    { left: "12%", top: "72%" },
    { left: "31%", top: "72%" },
    { left: "50%", top: "72%" },
    { left: "69%", top: "72%" },
    { left: "88%", top: "72%" },
  ];
  return (count <= 10 ? slots10 : slots12).slice(0, Math.max(1, count));
}

function wheelTheme(style?: string | null) {
  if (style === "cloud-gold") {
    return {
      shell:
        "border-[#ead9b0]/70 bg-[radial-gradient(circle_at_top,rgba(255,251,240,0.98),rgba(251,244,223,0.98)_45%,rgba(236,229,214,0.98))] text-slate-800",
      title: "text-[#caa45b] [text-shadow:0_2px_10px_rgba(255,245,210,0.9)]",
      center:
        "border-[#ecd29a]/90 bg-[linear-gradient(180deg,#4f6277,#334456)] shadow-[0_24px_70px_rgba(94,74,27,0.24)]",
      cardBorder: "border-[#ead8b3]/90",
      cardInner: "border-[#d8c6a1]/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,244,228,0.92))]",
      halo: "bg-[#f8edcf]/70",
    };
  }
  if (style === "night-slate") {
    return {
      shell:
        "border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,70,98,0.96),rgba(15,23,42,0.98)_48%,rgba(2,6,23,1))] text-white",
      title: "text-white [text-shadow:0_2px_16px_rgba(125,211,252,0.25)]",
      center:
        "border-white/20 bg-[linear-gradient(180deg,#243447,#0f172a)] shadow-[0_24px_70px_rgba(15,23,42,0.55)]",
      cardBorder: "border-white/40",
      cardInner: "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(148,163,184,0.14))]",
      halo: "bg-sky-200/10",
    };
  }
  return {
    shell:
      "border-slate-200/70 bg-[radial-gradient(circle_at_top,rgba(255,249,239,0.98),rgba(238,246,255,0.98)_45%,rgba(227,235,248,0.98))] text-slate-800",
    title: "text-slate-700 [text-shadow:0_4px_16px_rgba(255,255,255,0.95)]",
    center:
      "border-white/90 bg-[linear-gradient(180deg,#5f748a,#3d4a59)] shadow-[0_24px_70px_rgba(71,85,105,0.3)]",
    cardBorder: "border-[#eef0ea]/90",
    cardInner: "border-[#d9c6a4]/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,241,241,0.86))]",
    halo: "bg-white/80",
  };
}

export function LotteryWheelPageClient({
  locale,
  initialPoints,
  initialCouponCount,
  wheel,
}: {
  locale: Locale;
  initialPoints: number;
  initialCouponCount: number;
  wheel: Wheel;
}) {
  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  const theme = wheelTheme(wheel.backgroundStyle);
  const [points, setPoints] = useState(initialPoints);
  const [couponCount, setCouponCount] = useState(initialCouponCount);
  const [busyMode, setBusyMode] = useState<"points" | "coupon" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [activePrizeId, setActivePrizeId] = useState<string | null>(null);

  const displayPrizes = useMemo(() => {
    const list = wheel.prizes.slice(0, 12);
    return list.length ? list : [];
  }, [wheel.prizes]);

  async function spin(mode: "points" | "coupon") {
    if (busyMode) return;
    setBusyMode(mode);
    setResult(null);
    try {
      const res = await fetch("/api/lottery/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wheelId: wheel.id, mode }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        prizeId?: string;
        prizeName?: string;
        currentPoints?: number;
      };
      if (!res.ok) throw new Error(json.error || "spin_failed");

      const duration = Math.max(1800, wheel.spinDurationMs ?? 3600);
      const cycles = Math.max(displayPrizes.length * 2, 12);
      const targetIndex = Math.max(0, displayPrizes.findIndex((prize) => prize.id === json.prizeId));
      for (let step = 0; step < cycles + targetIndex + 1; step += 1) {
        window.setTimeout(() => {
          const prize = displayPrizes[step % displayPrizes.length];
          if (prize) setActivePrizeId(prize.id);
        }, Math.floor((duration / (cycles + targetIndex + 1)) * step));
      }

      window.setTimeout(() => {
        if (json.prizeId) setActivePrizeId(json.prizeId);
        setPoints(json.currentPoints ?? points);
        if (mode === "coupon") setCouponCount((current) => Math.max(0, current - 1));
        setResult(json.prizeName ? `${tr("抽中了：", "抽中了：", "Won: ")}${json.prizeName}` : tr("抽獎完成。", "抽奖完成。", "Done."));
        setBusyMode(null);
      }, duration + 80);
    } catch (error) {
      const code = error instanceof Error ? error.message : "spin_failed";
      if (code === "insufficient_points") setResult(tr("積分不足。", "积分不足。", "Not enough points."));
      else if (code === "coupon_not_available") setResult(tr("沒有可用抽獎券。", "没有可用抽奖券。", "No coupon available."));
      else setResult(tr("抽獎失敗，請稍後再試。", "抽奖失败，请稍后再试。", "Spin failed. Please try again later."));
      setBusyMode(null);
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-[2.4rem] border px-4 py-6 shadow-[0_30px_80px_rgba(148,163,184,0.28)] ${theme.shell}`}>
      <div className="pointer-events-none absolute inset-0 opacity-95">
        <div className={`absolute -left-16 -top-10 h-40 w-40 rounded-full shadow-[0_18px_40px_rgba(148,163,184,0.22)] ${theme.halo}`} />
        <div className={`absolute left-10 top-4 h-20 w-32 rounded-[999px] shadow-[0_12px_28px_rgba(148,163,184,0.14)] ${theme.halo}`} />
        <div className={`absolute right-2 top-2 h-28 w-40 rounded-[999px] shadow-[0_18px_40px_rgba(148,163,184,0.22)] ${theme.halo}`} />
        <div className={`absolute left-0 bottom-0 h-28 w-44 rounded-[999px] shadow-[0_-12px_30px_rgba(148,163,184,0.16)] ${theme.halo}`} />
        <div className={`absolute right-0 bottom-0 h-32 w-52 rounded-[999px] shadow-[0_-12px_30px_rgba(148,163,184,0.16)] ${theme.halo}`} />
      </div>

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/lottery" className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white">
            {tr("返回轉盤列表", "返回转盘列表", "Back")}
          </Link>
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-950">
            {tr("目前積分", "当前积分", "Points")} {points}
          </div>
        </div>

        <div className="text-center">
          <h1 className={`text-4xl font-black tracking-[0.2em] ${theme.title}`}>
            {wheel.name}
          </h1>
          {wheel.description ? <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-200">{wheel.description}</p> : null}
        </div>

        <div className="mx-auto mt-6 max-w-5xl">
          <div className="relative mx-auto aspect-square w-full max-w-[860px]">
            {framePositions(displayPrizes.length).map((pos, index) => {
              const prize = displayPrizes[index];
              if (!prize) return null;
              const imageUrl = prizeImageUrl(prize);
              const isActive = activePrizeId === prize.id;
              return (
                <button
                  key={prize.id}
                  type="button"
                  className={[
                    "absolute h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.6rem] border-[5px] bg-white/70 p-2 text-left shadow-[0_18px_35px_rgba(148,163,184,0.22)] transition",
                    theme.cardBorder,
                    isActive ? "scale-[1.04] border-amber-300 shadow-[0_0_0_6px_rgba(250,204,21,0.22)]" : "",
                  ].join(" ")}
                  style={{ left: pos.left, top: pos.top }}
                >
                  <div className={`h-full rounded-[1.1rem] border p-1 ${theme.cardInner}`}>
                    <div className="relative h-full overflow-hidden rounded-[0.9rem] bg-slate-100">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt={prizeDisplayName(prize, tr)} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(222,233,246,0.95))] text-center text-sm font-black text-slate-500">
                          {prize.rewardType === "none" ? tr("謝謝\n惠顧", "谢谢\n惠顾", "THANKS") : prize.rewardType === "points" ? `${prize.couponQuantity ?? 0}` : prizeDisplayName(prize, tr).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-x-1 bottom-1 rounded-full bg-slate-900/58 px-2 py-1 text-center text-[11px] font-semibold text-white backdrop-blur">
                        <div className="truncate">{prizeDisplayName(prize, tr)}</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            <div className={`absolute left-1/2 top-1/2 flex h-[30%] w-[36%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.2rem] border-[6px] p-4 ${theme.center}`}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.8rem] border border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(15,23,42,0.08))] text-center">
                <div className="mb-4 text-3xl font-black text-white">{tr("開始抽獎", "开始抽奖", "Start")}</div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {wheel.usePoints ? (
                    <button
                      type="button"
                      onClick={() => spin("points")}
                      disabled={busyMode !== null}
                      className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow hover:bg-slate-100 disabled:opacity-60"
                    >
                      {busyMode === "points" ? tr("抽獎中...", "抽奖中...", "Drawing...") : tr("積分抽", "积分抽", "Use points")}
                    </button>
                  ) : null}
                  {wheel.useCoupon ? (
                    <button
                      type="button"
                      onClick={() => spin("coupon")}
                      disabled={busyMode !== null || couponCount <= 0}
                      className="rounded-full bg-[#f6dfae] px-5 py-2.5 text-sm font-bold text-[#5c4731] shadow hover:bg-[#f2d595] disabled:opacity-60"
                    >
                      {busyMode === "coupon" ? tr("抽獎中...", "抽奖中...", "Drawing...") : tr("抽獎券抽", "抽奖券抽", "Use coupon")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-lg font-bold text-slate-700 dark:text-slate-100">
            {wheel.usePoints ? `${tr("每次消耗：", "每次消耗：", "Cost: ")}${wheel.spinCostPoints}${tr(" 積分", " 积分", " points")}` : null}
            {wheel.useCoupon ? `${wheel.usePoints ? " / " : ""}${tr("可用券：", "可用券：", "Coupons: ")}${wheel.couponTemplate?.name || tr("抽獎券", "抽奖券", "Coupon")} * ${couponCount}` : null}
          </div>

          {result ? <div className="mt-4 text-center text-xl font-black text-slate-800 dark:text-white">{result}</div> : null}

          <div id="lottery-rules" className="mt-8 rounded-[1.8rem] bg-white/70 p-4 text-sm text-slate-700 shadow-sm backdrop-blur dark:bg-slate-950/60 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{tr("抽獎規則", "抽奖规则", "Rules")}</div>
              <button
                type="button"
                onClick={() => document.getElementById("lottery-rules")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
              >
                {tr("查看機率", "查看概率", "Probabilities")}
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {displayPrizes.map((prize) => (
                <div key={prize.id} className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{prizeDisplayName(prize, tr)}</div>
                    <div className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">
                      {formatProbability(prize.probabilityWeight)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{prizeDescription(prize, tr) || tr("未填說明", "未填说明", "No description")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
