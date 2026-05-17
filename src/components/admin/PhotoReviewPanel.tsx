"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientLocale } from "@/i18n/client-locale";

const QUICK_REJECT_REASONS = [
  { zhHant: "過度處理", zhHans: "过度处理", en: "Over-processed" },
  { zhHant: "銳化過少", zhHans: "锐化过少", en: "Under-sharpened" },
  { zhHant: "對比度不適宜", zhHans: "对比度不适宜", en: "Bad contrast" },
  { zhHant: "裁切問題", zhHans: "裁切问题", en: "Cropping issue" },
  { zhHant: "錯誤資訊", zhHans: "错误信息", en: "Wrong info" },
  { zhHant: "亮度不佳", zhHans: "亮度不佳", en: "Bad brightness" },
  { zhHant: "曝光不佳", zhHans: "曝光不佳", en: "Bad exposure" },
  { zhHant: "高光溢出", zhHans: "高光溢出", en: "Highlights clipped" },
  { zhHant: "逆光", zhHans: "逆光", en: "Backlit" },
  { zhHant: "暗角", zhHans: "暗角", en: "Vignetting" },
  { zhHant: "光暈", zhHans: "光晕", en: "Haloing" },
  { zhHant: "顏色不佳", zhHans: "颜色不佳", en: "Bad colors" },
  { zhHant: "薄霧", zhHans: "薄雾", en: "Haze" },
  { zhHant: "髒點", zhHans: "脏点", en: "Spots/dust" },
  { zhHant: "太模糊", zhHans: "太模糊", en: "Too blurry" },
  { zhHant: "虛焦", zhHans: "虚焦", en: "Out of focus" },
  { zhHant: "水平偏斜", zhHans: "水平偏斜", en: "Horizon tilted" },
  { zhHant: "構圖問題", zhHans: "构图问题", en: "Composition issue" },
  { zhHant: "拍攝角度不佳", zhHans: "拍摄角度不佳", en: "Bad angle" },
  { zhHant: "主體過小", zhHans: "主体过小", en: "Subject too small" },
  { zhHant: "重複上傳", zhHans: "重复上传", en: "Duplicate" },
  { zhHant: "缺失序列號", zhHans: "缺失序列号", en: "Missing serial" },
  { zhHant: "機型無後綴", zhHans: "机型无后缀", en: "Model suffix missing" },
  { zhHant: "機型未標註 Airbus / Boeing / COMAC", zhHans: "机型未标注 Airbus / Boeing / COMAC", en: "Manufacturer missing" },
  { zhHant: "圖片不符合要求", zhHans: "图片不符合要求", en: "Not acceptable" },
  { zhHant: "非法圖片", zhHans: "非法图片", en: "Illegal" },
] as const;
const SESSION_KEY = "avispotters.reviewSession.v1";

function normalizeReasons(text: string) {
  return text
    .split(/、|\n|，|,|;|；/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pushSessionAction(payload: {
  kind: "approve" | "reject";
  photoId: string;
  label: string;
  reason?: string;
}) {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as { actions?: any[] }) : {};
    const prev = Array.isArray(parsed.actions) ? parsed.actions : [];
    const next = [
      {
        kind: payload.kind,
        photoId: payload.photoId,
        label: payload.label,
        reason: payload.reason ?? "",
        at: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 300);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ actions: next }));
  } catch {
    // ignore
  }
}

export function PhotoReviewPanel({
  photoId,
  photoLabel,
  initialAssignedToMe,
  initialFeatured,
  initialHot,
  initialStaffNote,
  canFeature,
  canHot,
  firstReview,
}: {
  photoId: string;
  photoLabel: string;
  initialAssignedToMe: boolean;
  initialFeatured: boolean;
  initialHot: boolean;
  initialStaffNote: string | null;
  canFeature: boolean;
  canHot: boolean;
  firstReview?: {
    decision: string | null;
    reason: string | null;
    reviewerName: string | null;
    reviewedAtIso: string | null;
  } | null;
}) {
  const router = useRouter();
  const locale = useClientLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState(initialStaffNote ?? "");
  const [featured, setFeatured] = useState(initialFeatured);
  const [hot, setHot] = useState(initialHot);
  const [reviewReason, setReviewReason] = useState("");
  const [approveNote, setApproveNote] = useState("");

  const api = useMemo(() => `/api/admin/photos/${encodeURIComponent(photoId)}`, [photoId]);

  function tr(zhHant: string, zhHans: string, en: string) {
    return locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant;
  }

  async function post(payload: any) {
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string; warning?: string; requireConfirm?: boolean };
      if (!res.ok) {
        if (res.status === 409 && json?.requireConfirm && payload?.action === "reject") {
          const ok = window.confirm(
            json.warning ||
              tr(
                "拒絕留言過於籠統。若仍要提交，系統會通知管理員。",
                "拒绝留言过于笼统。若仍要提交，系统会通知管理员。",
                "Reject note is too generic. If you continue, admin will be notified."
              )
          );
          if (ok) {
            const retry = await fetch(api, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...payload, forceRejectConfirm: true }),
            });
            const retryJson = (await retry.json().catch(() => ({}))) as { error?: string };
            if (!retry.ok) throw new Error(retryJson.error || tr("操作失敗", "操作失败", "Operation failed"));
          } else {
            return;
          }
        } else {
          throw new Error(json.error || tr("操作失敗", "操作失败", "Operation failed"));
        }
      }
      if (payload?.action === "approve" || payload?.action === "reject") {
        pushSessionAction({
          kind: payload.action,
          photoId,
          label: photoLabel,
          reason: payload.action === "reject" ? String(payload?.reviewReason ?? "") : String(payload?.approveNote ?? ""),
        });
        router.replace("/admin/photos");
        router.refresh();
        return;
      }
      setOk(tr("已更新", "已更新", "Updated"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("操作失敗", "操作失败", "Operation failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {firstReview?.decision ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {tr("初審結果（給二審參考）", "初审结果（二审参考）", "First review (for second review)")}
          </div>
          <div className="mt-2 text-xs text-amber-900/90 dark:text-amber-100/90">
            {tr("狀態：", "状态：", "Decision: ")}
            <span className="ml-1 font-extrabold">
              {firstReview.decision === "approved"
                ? tr("通過", "通过", "Approved")
                : firstReview.decision === "rejected"
                  ? tr("拒絕", "拒绝", "Rejected")
                  : String(firstReview.decision)}
            </span>
            {firstReview.reviewerName ? (
              <>
                {" "}
                · {tr("審核員：", "审核员：", "Reviewer: ")}
                <span className="font-semibold">{firstReview.reviewerName}</span>
              </>
            ) : null}
            {firstReview.reviewedAtIso ? (
              <>
                {" "}
                · {tr("時間：", "时间：", "At: ")}
                <span className="font-semibold">{firstReview.reviewedAtIso}</span>
              </>
            ) : null}
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-amber-900/90 dark:text-amber-100/90">
              {tr("初審原因/留言（顯示給攝影師）", "初审原因/留言（显示给摄影师）", "First review note (visible to photographer)")}
            </div>
            <div className="mt-2 whitespace-pre-wrap rounded-xl border border-amber-400/20 bg-white/60 p-3 text-sm leading-6 text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-slate-100">
              {firstReview.reason ? firstReview.reason : "—"}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-100">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-100">{ok}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{tr("審核操作", "审核操作", "Review actions")}</div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || initialAssignedToMe}
            onClick={() => post({ action: "assignToMe" })}
            className={[
              "rounded-xl px-3 py-2 text-sm font-semibold",
              loading || initialAssignedToMe
                ? "border border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10",
            ].join(" ")}
          >
            {tr("指派給我", "指派给我", "Assign to me")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => post({ action: "transfer", staffNote })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {tr("轉交（改為未指派）", "转交（改为未指派）", "Unassign")}
          </button>
        </div>

        {canFeature ? (
          <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-sky-50 p-3 dark:border-white/10 dark:bg-sky-950/30">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            <div className="text-sm text-slate-700 dark:text-slate-200">{tr("加入首頁「精選」", "加入首页「精选」", "Add to featured")}</div>
          </label>
        ) : null}
        {canHot ? (
          <label className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-amber-50 p-3 dark:border-white/10 dark:bg-amber-500/10">
            <input type="checkbox" checked={hot} onChange={(e) => setHot(e.target.checked)} />
            <div className="text-sm text-slate-700 dark:text-slate-200">{tr("標記為 HOT", "标记为 HOT", "Mark as HOT")}</div>
          </label>
        ) : null}

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            {tr("審核員內部備註（僅審核員可見）", "审核员内部备注（仅审核员可见）", "Staff note (staff only)")}
          </div>
          <textarea
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            placeholder={tr("內部備註（不會顯示給攝影師）", "内部备注（不会显示给摄影师）", "Internal note (not visible to uploader)")}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => post(canFeature || canHot ? { staffNote, featured, hot } : { staffNote })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {tr("儲存備註/精選/HOT", "保存备注/精选/HOT", "Save")}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{tr("通過", "通过", "Approve")}</div>
            <div className="mt-2 text-xs text-emerald-800/90 dark:text-emerald-100/90">
              {tr(
                "通過後會自動釋放攝影師上傳佇列名額，作品進入前台圖庫。",
                "通过后会自动释放摄影师上传队列名额，作品进入前台图库。",
                "Approved photos will be published to gallery."
              )}
            </div>
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-emerald-400/20 bg-black/10 px-3 py-2 text-sm text-emerald-950 outline-none placeholder:text-emerald-950/50 focus:border-emerald-300/40 dark:text-emerald-100 dark:placeholder:text-emerald-100/60"
              placeholder={tr("給攝影師留言（可選）…", "给摄影师留言（可选）…", "Message to photographer (optional)…")}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                post(canFeature || canHot ? { action: "approve", featured, hot, staffNote, approveNote } : { action: "approve", staffNote, approveNote })
              }
              className="mt-3 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:opacity-60"
            >
              {tr("通過", "通过", "Approve")}
            </button>
          </div>

          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
            <div className="text-sm font-semibold text-red-900 dark:text-red-100">{tr("拒絕", "拒绝", "Reject")}</div>
            <div className="mt-2 text-xs text-red-800/90 dark:text-red-100/90">
              {tr("必填拒絕原因/修改建議（會顯示給攝影師）。", "必填拒绝原因/修改建议（会显示给摄影师）。", "Reason is required (visible to uploader).")}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_REJECT_REASONS.map((r) => {
                const label = tr(r.zhHant, r.zhHans, r.en);
                const active = normalizeReasons(reviewReason).includes(label);
                return (
                  <button
                    key={r.zhHant}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      const set = new Set(normalizeReasons(reviewReason));
                      if (set.has(label)) set.delete(label);
                      else set.add(label);
                      setReviewReason(Array.from(set).join("、"));
                    }}
                    className={[
                      "rounded-xl border px-2.5 py-1 text-xs font-semibold",
                      active
                        ? "border-red-300/40 bg-red-400/20 text-red-900 dark:text-red-50"
                        : "border-red-400/20 bg-black/10 text-red-900/80 hover:bg-black/15 dark:text-red-100/90",
                      loading ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={loading}
                onClick={() => setReviewReason("")}
                className="rounded-xl border border-red-400/20 bg-black/10 px-2.5 py-1 text-xs font-semibold text-red-900/80 hover:bg-black/15 disabled:opacity-60 dark:text-red-100/90"
              >
                {tr("清空", "清空", "Clear")}
              </button>
            </div>

            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-red-400/20 bg-black/10 px-3 py-2 text-sm text-red-900 outline-none placeholder:text-red-900/50 focus:border-red-300/40 dark:text-red-100 dark:placeholder:text-red-100/60"
              placeholder={tr("水平需修正、曝光偏暗、主體過小、對焦不準…", "水平需修正、曝光偏暗、主体过小、对焦不准…", "Horizon needs adjustment, exposure too dark, subject too small, out of focus…")}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => post({ action: "reject", reviewReason, staffNote })}
              className="mt-3 rounded-xl bg-red-400 px-3 py-2 text-sm font-semibold text-red-950 hover:bg-red-300 disabled:opacity-60"
            >
              {tr("拒絕", "拒绝", "Reject")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

