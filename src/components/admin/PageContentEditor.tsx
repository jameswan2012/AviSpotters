"use client";

import { useEffect, useMemo, useState } from "react";

const HOME_EXAMPLE = JSON.stringify(
  {
    "zh-Hant": {
      heroBadge: "",
      heroTitle: "",
      heroDesc: "",
      toolboxTitle: "",
      toolboxDesc: "",
      toolboxItems: [{ title: "", desc: "", href: "" }],
    },
    "zh-Hans": {},
    en: {},
  },
  null,
  2
);

const ABOUT_EXAMPLE = JSON.stringify(
  {
    "zh-Hant": {
      heroTitle: "",
      heroDesc: "",
      contactItems: [{ label: "", value: "", href: "" }],
      groups: [{ title: "", desc: "", members: [{ userId: "", role: "", note: "" }] }],
      alumni: [{ userId: "", role: "", note: "" }],
    },
    "zh-Hans": {},
    en: {},
  },
  null,
  2
);

const SIMPLE_PAGE_EXAMPLE = JSON.stringify(
  {
    "zh-Hant": { description: "" },
    "zh-Hans": { description: "" },
    en: { description: "" },
  },
  null,
  2
);

export function PageContentEditor({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const placeholder = useMemo(() => {
    if (slug === "about") return ABOUT_EXAMPLE;
    if (slug === "shop" || slug === "lottery") return SIMPLE_PAGE_EXAMPLE;
    return HOME_EXAMPLE;
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/pages/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setValue(json?.page?.contentJson || "");
      })
      .catch(() => {
        if (!cancelled) setStatus("讀取失敗");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function onSave() {
    setBusy(true);
    setStatus("");
    try {
      JSON.parse(value || "{}");
      const res = await fetch(`/api/admin/pages/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentJson: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "save_failed");
      setStatus("已保存");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 shadow-2xl">
      <div className="mb-3 text-sm text-slate-300">
        {slug === "shop" || slug === "lottery" ? "請填入各語系的 description；留空就不顯示。" : "請填入合法 JSON，按語系保存頁面內容。"}
      </div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="min-h-[420px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-500"
        disabled={!canEdit || busy}
      />
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-300">{status}</div>
        <button
          type="button"
          onClick={onSave}
          disabled={!canEdit || busy}
          className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-300 disabled:opacity-50"
        >
          {busy ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
