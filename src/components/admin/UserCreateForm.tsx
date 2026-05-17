"use client";

import { useState } from "react";

export function UserCreateForm({ locale }: { locale: "zh-Hant" | "zh-Hans" | "en" }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "create_failed");
      setStatus(locale === "en" ? "Created" : locale === "zh-Hans" ? "已创建" : "已建立");
      setForm({ email: "", password: "", name: "" });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "create_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={locale === "en" ? "Display name" : locale === "zh-Hans" ? "显示名称" : "顯示名稱"} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
      <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={locale === "en" ? "Password" : locale === "zh-Hans" ? "密码" : "密碼"} type="password" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white" />
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-300">{status}</div>
        <button type="submit" disabled={busy} className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-sky-950 disabled:opacity-50">
          {busy ? "..." : locale === "en" ? "Create" : locale === "zh-Hans" ? "创建" : "建立"}
        </button>
      </div>
    </form>
  );
}
