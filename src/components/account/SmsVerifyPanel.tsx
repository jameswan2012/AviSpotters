"use client";

import { useMemo, useState } from "react";
import { useClientLocale } from "@/i18n/client-locale";

export type SmsVerifyPurpose = "register" | "login_bind_phone" | "change_phone";

export function SmsVerifyPanel({
  purpose,
  phone,
  captchaId,
  captchaCode,
  bindToken,
  onVerified,
  disabled,
}: {
  purpose: SmsVerifyPurpose;
  phone: string;
  captchaId: string | null;
  captchaCode: string;
  bindToken?: string | null;
  onVerified: (r: { grantId?: string; user?: any }) => void;
  disabled?: boolean;
}) {
  const locale = useClientLocale();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
        title: "Phone verification",
        desc: purpose === "change_phone" ? "Verify your new phone number by SMS code." : "A 6-digit code will be sent by SMS.",
        send: "Send SMS code",
        sending: "Sending…",
        verify: "Verify",
        verifying: "Verifying…",
        sentOk: "SMS code sent.",
        verifiedOk: "Phone verification passed.",
        needCaptcha: "Please complete captcha first.",
        needPhone: "Please enter a valid phone number.",
        notConfigured: "SMS provider is not configured on server.",
        sendFailed: "SMS send failed. Please try again later.",
        timeout: "SMS gateway timeout. Please try again later.",
        network: "SMS gateway network error. Check server DNS/network.",
        accountBad: "SMS account/password is incorrect.",
        accountMissing: "SMS account does not exist.",
        balanceLow: "SMS balance is insufficient.",
        ipLimited: "SMS gateway blocked this server IP.",
        contentBlocked: "SMS content blocked by provider.",
      };
    }
    if (locale === "zh-Hans") {
      return {
        title: "手机验证",
        desc: purpose === "change_phone" ? "请用短信验证码确认新手机号。" : "系统会发送 6 位短信验证码。",
        send: "发送短信验证码",
        sending: "发送中…",
        verify: "验证",
        verifying: "验证中…",
        sentOk: "短信验证码已发送。",
        verifiedOk: "手机验证成功。",
        needCaptcha: "请先完成图形验证码。",
        needPhone: "请输入有效手机号。",
        notConfigured: "服务器未配置短信通道。",
        sendFailed: "短信发送失败，请稍后再试。",
        timeout: "短信网关超时，请稍后再试。",
        network: "短信网关网络错误，请检查服务器 DNS/网络。",
        accountBad: "短信账号或密钥错误。",
        accountMissing: "短信账号不存在。",
        balanceLow: "短信余额不足。",
        ipLimited: "短信平台限制了当前服务器 IP。",
        contentBlocked: "短信内容被平台拦截。",
      };
    }
    return {
      title: "手機驗證",
      desc: purpose === "change_phone" ? "請用短信驗證碼確認新手機號。" : "系統會發送 6 位短信驗證碼。",
      send: "發送短信驗證碼",
      sending: "發送中…",
      verify: "驗證",
      verifying: "驗證中…",
      sentOk: "短信驗證碼已發送。",
      verifiedOk: "手機驗證成功。",
      needCaptcha: "請先完成圖像驗證碼。",
      needPhone: "請輸入有效手機號。",
      notConfigured: "伺服器未設定短信通道。",
      sendFailed: "短信發送失敗，請稍後再試。",
      timeout: "短信網關逾時，請稍後再試。",
      network: "短信網關網路錯誤，請檢查伺服器 DNS/網路。",
      accountBad: "短信帳號或金鑰錯誤。",
      accountMissing: "短信帳號不存在。",
      balanceLow: "短信餘額不足。",
      ipLimited: "短信平台限制了目前伺服器 IP。",
      contentBlocked: "短信內容被平台攔截。",
    };
  }, [locale, purpose]);

  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    const ms = cooldownUntil - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }, [cooldownUntil]);

  async function sendCode() {
    if (disabled) return;
    setErr(null);
    setMsg(null);
    setSending(true);
    try {
      const res = await fetch("/api/sms/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone,
          purpose,
          captchaId,
          captchaCode,
          bindToken: bindToken || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        if (json?.error === "account_banned" || json?.code === "account_banned") {
          goBlocked({
            email: json?.email || null,
            bannedUntil: json?.bannedUntil || null,
            permanent: !!json?.permanent,
          });
          return;
        }
        if (json?.error === "too_fast" && typeof json?.retryAfterMs === "number") {
          setCooldownUntil(Date.now() + json.retryAfterMs);
        }
        if (json?.error === "captcha_invalid") throw new Error(text.needCaptcha);
        if (json?.error === "phone_invalid") throw new Error(text.needPhone);
        if (json?.error === "phone_feature_disabled")
          throw new Error(locale === "en" ? "Phone features are disabled by admin." : locale === "zh-Hans" ? "管理员已关闭手机功能。" : "管理員已關閉手機功能。");
        if (json?.error === "sms_not_configured") throw new Error(text.notConfigured);
        if (json?.error === "sms_timeout") throw new Error(text.timeout);
        if (String(json?.error || "").startsWith("sms_network_error")) throw new Error(text.network);
        if (json?.error === "smsbao_bad_password") throw new Error(text.accountBad);
        if (json?.error === "smsbao_account_not_found") throw new Error(text.accountMissing);
        if (json?.error === "smsbao_balance_insufficient") throw new Error(text.balanceLow);
        if (json?.error === "smsbao_ip_limited") throw new Error(text.ipLimited);
        if (json?.error === "smsbao_sensitive_content") throw new Error(text.contentBlocked);
        throw new Error(text.sendFailed);
      }
      if (typeof json?.cooldownMs === "number") setCooldownUntil(Date.now() + json.cooldownMs);
      if (typeof json?.devCode === "string") {
        setCode(json.devCode);
        setMsg(`${text.sentOk} (DEV: ${json.devCode})`);
      } else {
        setMsg(text.sentOk);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "sms_send_failed");
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (disabled) return;
    setErr(null);
    setMsg(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/sms/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone,
          purpose,
          code,
          bindToken: bindToken || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        if (json?.error === "phone_feature_disabled") {
          throw new Error(locale === "en" ? "Phone features are disabled by admin." : locale === "zh-Hans" ? "管理员已关闭手机功能。" : "管理員已關閉手機功能。");
        }
        throw new Error(json?.error || "verify_failed");
      }
      onVerified({ grantId: json?.grantId, user: json?.user });
      setMsg(text.verifiedOk);
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
      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        Phone：<span className="font-semibold text-slate-900 dark:text-slate-100">{phone || "—"}</span>
      </div>
      {msg ? <div className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">{msg}</div> : null}
      {err ? <div className="mt-2 text-sm text-red-700 dark:text-red-200">{err}</div> : null}
      <div className="mt-3 flex flex-col gap-2 md:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          inputMode="numeric"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100"
          placeholder={locale === "en" ? "6-digit code" : locale === "zh-Hans" ? "6 位验证码" : "6 位驗證碼"}
          disabled={disabled || verifying || sending}
        />
        <button
          type="button"
          onClick={() => void sendCode()}
          disabled={
            disabled ||
            sending ||
            verifying ||
            cooldownSeconds > 0 ||
            !phone ||
            (purpose !== "change_phone" && (!captchaId || captchaCode.trim().length < 4))
          }
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
        >
          {sending ? text.sending : cooldownSeconds > 0 ? `${text.send} (${cooldownSeconds}s)` : text.send}
        </button>
        <button
          type="button"
          onClick={() => void verify()}
          disabled={disabled || sending || verifying || code.length !== 6 || !phone}
          className="h-10 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {verifying ? text.verifying : text.verify}
        </button>
      </div>
    </div>
  );
}
