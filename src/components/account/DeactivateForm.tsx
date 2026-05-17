"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/i18n/t";
import { useClientLocale } from "@/i18n/client-locale";
import { EmailVerifyPanel } from "@/components/account/EmailVerifyPanel";

export function DeactivateForm() {
  const router = useRouter();
  const locale = useClientLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [email, setEmail] = useState<string>("");
  const [verifyGrantId, setVerifyGrantId] = useState<string | null>(null);

  const canSubmit = confirmText.trim().toLowerCase() === "deactivate";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = (await res.json().catch(() => ({}))) as any;
        const e = String(json?.user?.email ?? "");
        if (!cancelled) setEmail(e);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onDeactivate() {
    setError(null);
    if (!canSubmit) return;
    if (!verifyGrantId) {
      setError(locale === "en" ? "Email verification required." : locale === "zh-Hans" ? "需要邮箱验证。" : "需要 Email 驗證。");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verifyGrantId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || t(locale, "account.deactivate.failed"));
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "account.deactivate.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ui-panel border-red-400/40 bg-gradient-to-br from-red-500/15 to-rose-500/10 p-6">
      <div className="text-sm font-semibold text-red-700 dark:text-red-200">{t(locale, "account.deactivate.irreversible")}</div>
      <div className="mt-2 text-sm leading-6 text-red-800/90 dark:text-red-100/90">
        {t(locale, "account.deactivate.prompt", { word: "deactivate" })}
      </div>

      <div className="mt-4">
        <EmailVerifyPanel
          purpose="deactivate"
          email={email}
          disabled={loading}
          onVerified={(r) => {
            if (r.grantId) setVerifyGrantId(r.grantId);
          }}
        />
      </div>

      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="deactivate"
        className="mt-4 w-full rounded-xl border border-red-300/40 bg-white/80 px-3 py-2 text-sm text-red-900 outline-none placeholder:text-red-500/60 focus:border-red-500/50 dark:border-red-300/20 dark:bg-black/10 dark:text-red-50 dark:placeholder:text-red-100/60"
      />

      {error ? <div className="mt-3 text-sm text-red-700 dark:text-red-100">{error}</div> : null}

      <button
        type="button"
        onClick={onDeactivate}
        disabled={!canSubmit || loading || !verifyGrantId}
        className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-60"
      >
        {loading ? t(locale, "account.deactivate.confirming") : t(locale, "account.deactivate.confirm")}
      </button>
    </div>
  );
}

