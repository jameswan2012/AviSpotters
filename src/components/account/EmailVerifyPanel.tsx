"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

export type EmailVerifyPurpose = "register" | "deactivate" | "photo_delete" | "change_password" | "change_name" | "change_email";

export function EmailVerifyPanel({
  purpose,
  email,
  onVerified,
  disabled,
  autoSend = true,
}: {
  purpose: EmailVerifyPurpose;
  email: string;
  onVerified: (r: { grantId?: string; verifiedUntil?: string }) => void;
  disabled?: boolean;
  autoSend?: boolean;
}) {
  const locale = useClientLocale();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const autoSentKeyRef = useRef<string>("");

  function goBlocked(data: { email?: string | null; bannedUntil?: string | null; permanent?: boolean }) {
    const p = new URLSearchParams();
    if (data.email) p.set("email", String(data.email));
    if (data.bannedUntil) p.set("until", String(data.bannedUntil));
    if (data.permanent) p.set("permanent", "1");
    window.location.href = `/auth/blocked?${p.toString()}`;
  }

  const text = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Email verification",
        desc: "We will send a 6-digit code to your email.",
        send: "Send code",
        sending: "Sending…",
        verify: "Verify",
        verifying: "Verifying…",
        code: "Code",
        placeholder: "6-digit code",
        okSent: "Code sent. Please check your inbox.",
        okVerified: "Verified.",
        tooFast: (s: number) => `Too fast. Try again in ${s}s.`,
        mailNotConfigured: "Mail is not configured on server.",
        smtpAuthFailed: "SMTP authentication failed (check app password).",
        smtpFromRejected: "Sender address rejected (check From/User).",
        smtpConnectFailed: "SMTP connection failed.",
        smtpTimeout: "SMTP timeout.",
        smtpTlsFailed: "SMTP TLS handshake failed.",
        smtpSendFailed: "Send failed. Please try again later.",
      };
    }
    if (locale === "zh-Hans") {
      return {
        title: "邮件验证",
        desc: "我们会向你的邮箱发送 6 位验证码。",
        send: "发送验证码",
        sending: "发送中…",
        verify: "验证",
        verifying: "验证中…",
        code: "验证码",
        placeholder: "6 位数字",
        okSent: "验证码已发送，请查看邮箱。",
        okVerified: "验证通过。",
        tooFast: (s: number) => `操作过快，请 ${s} 秒后再试。`,
        mailNotConfigured: "服务器未配置邮件发送。",
        smtpAuthFailed: "SMTP 认证失败（请检查授权码/客户端专用密码）。",
        smtpFromRejected: "发件人被拒绝（请检查 From/账号是否一致）。",
        smtpConnectFailed: "SMTP 连接失败。",
        smtpTimeout: "SMTP 连接超时。",
        smtpTlsFailed: "SMTP TLS 握手失败。",
        smtpSendFailed: "发送失败，请稍后再试。",
      };
    }
    return {
      title: "郵件驗證",
      desc: "我們會向你的 Email 發送 6 位驗證碼。",
      send: "送出驗證碼",
      sending: "送出中…",
      verify: "驗證",
      verifying: "驗證中…",
      code: "驗證碼",
      placeholder: "6 位數字",
      okSent: "驗證碼已送出，請查看信箱。",
      okVerified: "驗證成功。",
      tooFast: (s: number) => `操作過快，請 ${s} 秒後再試。`,
      mailNotConfigured: "伺服器尚未設定寄信功能。",
      smtpAuthFailed: "SMTP 認證失敗（請檢查授權碼/客戶端專用密碼）。",
      smtpFromRejected: "寄件人被拒絕（請檢查 From/帳號是否一致）。",
      smtpConnectFailed: "SMTP 連線失敗。",
      smtpTimeout: "SMTP 連線逾時。",
      smtpTlsFailed: "SMTP TLS 握手失敗。",
      smtpSendFailed: "送出失敗，請稍後再試。",
    };
  }, [locale]);

  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    const ms = cooldownUntil - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }, [cooldownUntil]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const t = setInterval(() => {
      if (cooldownUntil <= Date.now()) setCooldownUntil(null);
    }, 500);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const sendCode = useCallback(async () => {
    if (disabled) return;
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) return;
    setErr(null);
    setMsg(null);
    setSending(true);
    try {
      const res = await fetch("/api/email/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailTrim, purpose, locale }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        if (json?.error === "account_banned" || json?.code === "account_banned") {
          goBlocked({
            email: json?.email || emailTrim,
            bannedUntil: json?.bannedUntil || null,
            permanent: !!json?.permanent,
          });
          return;
        }
        if (json?.error === "too_fast" && typeof json?.retryAfterMs === "number") {
          const s = Math.max(1, Math.ceil(json.retryAfterMs / 1000));
          setCooldownUntil(Date.now() + json.retryAfterMs);
          throw new Error(text.tooFast(s));
        }
        if (json?.error === "mail_not_configured") throw new Error(text.mailNotConfigured);
        if (json?.error === "smtp_auth_failed") throw new Error(text.smtpAuthFailed);
        if (json?.error === "smtp_from_rejected") throw new Error(text.smtpFromRejected);
        if (json?.error === "smtp_connect_failed" || json?.error === "smtp_dns_failed") throw new Error(text.smtpConnectFailed);
        if (json?.error === "smtp_timeout") throw new Error(text.smtpTimeout);
        if (json?.error === "smtp_tls_failed") throw new Error(text.smtpTlsFailed);
        if (json?.error === "smtp_send_failed") throw new Error(text.smtpSendFailed);
        throw new Error(json?.error || "send_failed");
      }
      if (typeof json?.cooldownMs === "number") setCooldownUntil(Date.now() + json.cooldownMs);
      // Dev-only: server may return the OTP code directly when SMTP isn't configured.
      if (typeof json?.devCode === "string" && /^\d{6}$/.test(json.devCode)) {
        setCode(json.devCode);
        setMsg(`${text.okSent}（DEV：${json.devCode}）`);
      } else {
        setMsg(text.okSent);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "send_failed");
    } finally {
      setSending(false);
    }
  }, [disabled, email, locale, purpose, text]);

  useEffect(() => {
    if (!autoSend || disabled) return;
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim || !emailTrim.includes("@")) return;
    const key = `${purpose}|${emailTrim}`;
    if (autoSentKeyRef.current === key) return;
    autoSentKeyRef.current = key;
    void sendCode();
  }, [autoSend, disabled, email, purpose, sendCode]);

  async function verify() {
    if (disabled) return;
    const c = code.trim();
    if (!c) return;
    setErr(null);
    setMsg(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/email/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, purpose, code: c }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(json?.error || "verify_failed");
      setMsg(text.okVerified);
      onVerified({ grantId: json?.grantId, verifiedUntil: json?.verifiedUntil });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "verify_failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{text.title}</div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{text.desc}</div>
      <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
        Email：
        <span className="ml-1 font-semibold text-slate-900 dark:text-slate-100">{email || "—"}</span>
      </div>

      {msg ? <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-200">{msg}</div> : null}
      {err ? <div className="mt-3 text-sm text-red-700 dark:text-red-200">{err}</div> : null}

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end">
        <div className="grow">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{text.code}</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            placeholder={text.placeholder}
            inputMode="numeric"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
            disabled={disabled || sending || verifying}
            onKeyDown={(e) => {
              if (e.key === "Enter") void verify();
            }}
          />
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={sendCode}
            disabled={disabled || sending || verifying || cooldownSeconds > 0 || !email.trim()}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {sending ? text.sending : cooldownSeconds > 0 ? `${text.send} (${cooldownSeconds}s)` : text.send}
          </button>
          <button
            type="button"
            onClick={verify}
            disabled={disabled || verifying || sending || code.trim().length !== 6 || !email.trim()}
            className="h-10 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {verifying ? text.verifying : text.verify}
          </button>
        </div>
      </div>
    </div>
  );
}

