"use client";

import { useEffect, useState } from "react";
import { t } from "@/i18n/t";
import { useClientLocale } from "@/i18n/client-locale";

export function AircraftSubmissionForm() {
  const locale = useClientLocale();
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [registration, setRegistration] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");
  const [airline, setAirline] = useState("");
  const [msn, setMsn] = useState("");
  const [note, setNote] = useState("");

  const [myRecent, setMyRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/aircraft/submissions");
        const json = (await res.json()) as { results?: any[] };
        if (res.ok && Array.isArray(json.results)) setMyRecent(json.results);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function submit() {
    setOk(null);
    setError(null);
    const reg = registration.trim().toUpperCase();
    if (!reg) return;
    try {
      setLoading(true);
      const res = await fetch("/api/aircraft/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          registration: reg,
          aircraftModel: aircraftModel.trim() || null,
          airline: airline.trim() || null,
          msn: msn.trim() || null,
          note: note.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "提交失敗");
      setOk(locale === "en" ? "Submitted" : locale === "zh-Hans" ? "已提交" : "已提交");
      setRegistration("");
      setAircraftModel("");
      setAirline("");
      setMsn("");
      setNote("");
      const res2 = await fetch("/api/aircraft/submissions");
      const json2 = (await res2.json()) as { results?: any[] };
      if (res2.ok && Array.isArray(json2.results)) setMyRecent(json2.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
      {ok ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{ok}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={locale === "en" ? "Registration" : locale === "zh-Hans" ? "注册号" : "註冊號"}>
            <Input value={registration} onChange={setRegistration} placeholder="B-32A1 / N123AA" />
          </Field>
          <Field label={locale === "en" ? "MSN (optional)" : locale === "zh-Hans" ? "MSN（可选）" : "MSN（可選）"}>
            <Input value={msn} onChange={setMsn} placeholder="(optional)" />
          </Field>
          <Field label={locale === "en" ? "Airline (optional)" : locale === "zh-Hans" ? "航空公司（可选）" : "航空公司（可選）"}>
            <Input value={airline} onChange={setAirline} placeholder="Air China" />
          </Field>
          <Field label={locale === "en" ? "Aircraft model (optional)" : locale === "zh-Hans" ? "机型（可选）" : "機型（可選）"}>
            <Input value={aircraftModel} onChange={setAircraftModel} placeholder="A359 / B77W" />
          </Field>
        </div>

        <Field label={locale === "en" ? "Note (optional)" : locale === "zh-Hans" ? "备注（可选）" : "備註（可選）"}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            placeholder={locale === "en" ? "Any extra context…" : locale === "zh-Hans" ? "补充说明…" : "補充說明…"}
          />
        </Field>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={loading || !registration.trim()}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? (locale === "en" ? "Submitting…" : locale === "zh-Hans" ? "提交中…" : "提交中…") : (locale === "en" ? "Submit" : locale === "zh-Hans" ? "提交" : "提交")}
          </button>
        </div>
      </div>

      {myRecent.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="font-semibold text-slate-900 dark:text-white">{locale === "en" ? "My recent submissions" : locale === "zh-Hans" ? "我的近期提交" : "我的近期提交"}</div>
          <div className="mt-3 space-y-2 text-slate-700 dark:text-slate-200">
            {myRecent.slice(0, 8).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-sky-50 px-3 py-2 dark:border-white/10 dark:bg-sky-950/30">
                <div className="font-semibold">{r.registration}</div>
                <div className="text-xs opacity-80">{r.status}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
    />
  );
}

