"use client";

import { useEffect, useMemo, useState } from "react";

type ModerationConfig = {
  enabled: boolean;
  lowWords: string[];
  highWords: string[];
  externalLexiconEnabled: boolean;
  externalLexiconLevel: "low" | "high";
  highLockMinutes: number;
  highLockMessage: string;
  autoBanIpOnHigh: boolean;
};

type ExternalLexiconStatus = {
  file: string;
  count: number;
  loaded: boolean;
};

type IncidentRow = {
  id: string;
  status: string;
  staffReply: string | null;
  createdAt: string;
  updatedAt: string;
  incident: {
    level: "low" | "high";
    source: string;
    userId: string | null;
    ip: string | null;
    text: string;
    matches: string[];
    action: string;
    createdAt: string;
  };
};

export function ModerationAdmin() {
  const [config, setConfig] = useState<ModerationConfig | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [externalLexicon, setExternalLexicon] = useState<ExternalLexiconStatus | null>(null);

  const [lowWordsText, setLowWordsText] = useState("");
  const [highWordsText, setHighWordsText] = useState("");

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [cfgRes, incRes] = await Promise.all([
        fetch("/api/admin/site/moderation", { cache: "no-store" }),
        fetch("/api/admin/moderation/incidents", { cache: "no-store" }),
      ]);
      const cfgJson = await cfgRes.json();
      const incJson = await incRes.json();
      if (!cfgRes.ok) throw new Error(cfgJson.error || "load_config_failed");
      if (!incRes.ok) throw new Error(incJson.error || "load_incidents_failed");
      setConfig(cfgJson.config);
      setExternalLexicon(cfgJson.externalLexicon ?? null);
      setIncidents(Array.isArray(incJson.incidents) ? incJson.incidents : []);
      setLowWordsText((cfgJson.config?.lowWords || []).join("\n"));
      setHighWordsText((cfgJson.config?.highWords || []).join("\n"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const lowWords = lowWordsText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const highWords = highWordsText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/site/moderation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...config,
          lowWords,
          highWords,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "save_failed");
      setConfig(json.config);
      setExternalLexicon(json.externalLexicon ?? externalLexicon);
      setMsg("已保存");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  async function reviewIncident(incidentId: string, action: "approve" | "ban", banHours = 24, banIp = false) {
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/moderation/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ incidentId, action, banHours, banIp }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "review_failed");
      setMsg("处理完成");
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "review_failed");
    }
  }

  const openIncidents = useMemo(() => incidents.filter((x) => x.status === "open"), [incidents]);

  if (loading) return <div className="text-sm text-slate-700 dark:text-slate-200">Loading...</div>;
  if (!config) return <div className="text-sm text-red-600">{err || "加载失败"}</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">内容安全策略</div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          低敏感命中：直接删除内容；高敏感命中：自动锁定账号并通知管理员。
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((p) => (p ? { ...p, enabled: e.target.checked } : p))}
              className="mr-2"
            />
            启用全站检测
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.autoBanIpOnHigh}
              onChange={(e) => setConfig((p) => (p ? { ...p, autoBanIpOnHigh: e.target.checked } : p))}
              className="mr-2"
            />
            高敏感自动封 IP
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={config.externalLexiconEnabled !== false}
              onChange={(e) => setConfig((p) => (p ? { ...p, externalLexiconEnabled: e.target.checked } : p))}
              className="mr-2"
            />
            启用外部敏感词库（Sensitive-lexicon）
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            外部词库命中等级
            <select
              value={config.externalLexiconLevel || "low"}
              onChange={(e) =>
                setConfig((p) =>
                  p ? { ...p, externalLexiconLevel: e.target.value === "high" ? "high" : "low" } : p
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-sky-950/40"
            >
              <option value="low">低敏感（删除内容）</option>
              <option value="high">高敏感（锁号处理）</option>
            </select>
          </label>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <div className="font-semibold">外部词库状态</div>
            <div className="mt-2">已加载：{externalLexicon?.loaded ? "是" : "否"}</div>
            <div>词条数：{externalLexicon?.count ?? 0}</div>
            <div className="break-all">文件：{externalLexicon?.file ?? "-"}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">低敏感词库（每行一个）</div>
            <textarea
              value={lowWordsText}
              onChange={(e) => setLowWordsText(e.target.value)}
              rows={10}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-sky-950/40"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">高敏感词库（每行一个）</div>
            <textarea
              value={highWordsText}
              onChange={(e) => setHighWordsText(e.target.value)}
              rows={10}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-sky-950/40"
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            锁定分钟数
            <input
              type="number"
              min={1}
              max={525600}
              value={config.highLockMinutes}
              onChange={(e) =>
                setConfig((p) => (p ? { ...p, highLockMinutes: Math.max(1, Number(e.target.value || 1)) } : p))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-sky-950/40"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            高敏感提示文案（登录页提示）
            <textarea
              rows={3}
              value={config.highLockMessage}
              onChange={(e) => setConfig((p) => (p ? { ...p, highLockMessage: e.target.value } : p))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-sky-950/40"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={saveConfig}
            disabled={saving}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存策略"}
          </button>
          {msg ? <span className="text-sm text-emerald-600">{msg}</span> : null}
          {err ? <span className="text-sm text-red-600">{err}</span> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">待审查违规事件（{openIncidents.length}）</div>
        <div className="mt-3 space-y-3">
          {openIncidents.length === 0 ? <div className="text-sm text-slate-600 dark:text-slate-300">暂无</div> : null}
          {openIncidents.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-sky-950/30">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {row.incident.level.toUpperCase()} | {row.incident.source} | user={row.incident.userId ?? "-"} | ip=
                {row.incident.ip ?? "-"}
              </div>
              <div className="mt-1 text-xs text-slate-700 dark:text-slate-200">命中词：{row.incident.matches.join(", ") || "-"}</div>
              <div className="mt-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                {row.incident.text || "(empty)"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void reviewIncident(row.id, "approve")}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200"
                >
                  合规并解封
                </button>
                <button
                  type="button"
                  onClick={() => void reviewIncident(row.id, "ban", 24, false)}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-200"
                >
                  不合规，封号 24h
                </button>
                <button
                  type="button"
                  onClick={() => void reviewIncident(row.id, "ban", 72, true)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-200"
                >
                  不合规，封号+封IP 72h
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

