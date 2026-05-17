"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useClientLocale } from "@/i18n/client-locale";

type AirportPayload = {
  id: string;
  iata: string | null;
  icao: string | null;
  nameZh: string;
  nameEn: string;
  keywordsJson: string | null;
  intro: string | null;
  factsJson: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  timezone: string | null;
  openedOn: string | null;
  category: string | null;
  nature: string | null;
  elevationM: number | null;
  lat: number | null;
  lon: number | null;
  terminalsJson: string | null;
  airlinesJson: string | null;
  trafficJson: string | null;
  runwaysJson: string | null;
  photosJson: string | null;
  taxiwayPhotosJson: string | null;
  notes: string | null;
};

type FormState = Omit<AirportPayload, "id"> & { id?: string };

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

const EX_TERMINALS = prettyJson([
  { name: "T1", areaWanSqm: 12.7 },
  { name: "T2", areaWanSqm: 36.3, notes: "國內/國際" },
]);
const EX_RUNWAYS = prettyJson([
  { ident: "18L/36R", lengthM: 3400, widthM: 45, surface: "瀝青/混凝土" },
  { ident: "18R/36L", lengthM: 3300, widthM: 60 },
]);
const EX_AIRLINES = prettyJson(["中國國航", "中國東航", "中國南航"]);
const EX_TRAFFIC = prettyJson({ commercialFlights: "例如：年航班量 / 日均起降 / 旅客吞吐量", paxPerYear: null, cargoTonsPerYear: null });
const EX_PHOTOS = prettyJson(["https://example.com/airport.jpg"]);
const EX_FACTS = prettyJson([
  { label: "航站樓數量", value: "5" },
  { label: "大小", value: "總建築面積約 143.8 萬㎡（示例）" },
  { label: "商業航班量", value: "年旅客/航班量（可填資料來源）" },
  { label: "樞紐航空公司", value: "國航 / 東航 / …" },
  { label: "跑道資訊", value: "01/19、18L/36R…" },
]);

export function AirportEditorForm({
  airportId,
  canEdit,
  mode,
}: {
  airportId?: string;
  canEdit: boolean;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const locale = useClientLocale();
  const tr = useMemo(() => {
    return (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);
  }, [locale]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    iata: null,
    icao: null,
    nameZh: "",
    nameEn: "",
    keywordsJson: null,
    intro: null,
    factsJson: null,
    city: null,
    province: null,
    country: "中國",
    timezone: null,
    openedOn: null,
    category: null,
    nature: "civil",
    elevationM: null,
    lat: null,
    lon: null,
    terminalsJson: null,
    airlinesJson: null,
    trafficJson: null,
    runwaysJson: null,
    photosJson: null,
    taxiwayPhotosJson: null,
    notes: null,
  });

  const [keywordsText, setKeywordsText] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !airportId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/airports/${encodeURIComponent(airportId)}`);
        const json = (await res.json()) as { airport?: AirportPayload; error?: string };
        if (!res.ok || !json.airport) throw new Error(json.error || tr("讀取失敗", "读取失败", "Load failed"));
        if (cancelled) return;
        const a = json.airport;
        let kt = "";
        try {
          const arr = a.keywordsJson ? (JSON.parse(a.keywordsJson) as unknown) : [];
          kt = Array.isArray(arr) ? arr.filter((x) => typeof x === "string").join(", ") : "";
        } catch {
          kt = "";
        }
        setKeywordsText(kt);
        setForm({
          iata: a.iata,
          icao: a.icao,
          nameZh: a.nameZh,
          nameEn: a.nameEn,
          keywordsJson: a.keywordsJson,
          intro: a.intro,
          factsJson: a.factsJson,
          city: a.city,
          province: a.province,
          country: a.country,
          timezone: a.timezone,
          openedOn: a.openedOn,
          category: a.category,
          nature: a.nature,
          elevationM: a.elevationM,
          lat: a.lat,
          lon: a.lon,
          terminalsJson: a.terminalsJson,
          airlinesJson: a.airlinesJson,
          trafficJson: a.trafficJson,
          runwaysJson: a.runwaysJson,
          photosJson: a.photosJson,
          taxiwayPhotosJson: a.taxiwayPhotosJson,
          notes: a.notes,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : tr("讀取失敗", "读取失败", "Load failed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [airportId, mode, tr]);

  const helper = useMemo(() => {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200">
        <div className="font-semibold text-slate-900 dark:text-white">{tr("欄位格式提示", "字段格式提示", "Field format tips")}</div>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-200">
          <li>
            - {tr("航站樓", "航站楼", "Terminals")}：`terminalsJson` ({tr("陣列", "数组", "array")}：{`{ name, areaWanSqm, notes }`})
          </li>
          <li>
            - {tr("跑道", "跑道", "Runways")}：`runwaysJson` ({tr("陣列", "数组", "array")}：{`{ ident, lengthM, widthM, surface, notes }`})
          </li>
          <li>
            - {tr("航空公司", "航空公司", "Airlines")}：`airlinesJson` ({tr("字串陣列", "字符串数组", "string[]")})
          </li>
          <li>
            - {tr("吞吐/航班量", "吞吐/航班量", "Traffic")}：`trafficJson` ({tr("物件", "对象", "object")})
          </li>
          <li>
            - {tr("照片", "照片", "Photos")}：`photosJson` / `taxiwayPhotosJson` ({tr("URL 字串陣列", "URL 字符串数组", "URL string[]")})
          </li>
        </ul>
      </div>
    );
  }, [tr]);

  async function onSave() {
    setOk(null);
    setError(null);
    if (!canEdit) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        iata: form.iata ? form.iata.toUpperCase().trim() : null,
        icao: form.icao ? form.icao.toUpperCase().trim() : null,
        nameZh: form.nameZh.trim(),
        nameEn: form.nameEn.trim(),
        keywords: keywordsText,
      };

      const res =
        mode === "new"
          ? await fetch("/api/admin/airports", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/admin/airports/${encodeURIComponent(airportId!)}`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });

      const json = (await res.json()) as { airport?: AirportPayload; error?: string };
      if (!res.ok || !json.airport) throw new Error(json.error || tr("儲存失敗", "保存失败", "Save failed"));

      setOk(tr("已儲存", "已保存", "Saved"));
      if (mode === "new") {
        router.replace(`/admin/airports/${encodeURIComponent(json.airport.id)}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("儲存失敗", "保存失败", "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {helper}

      {loading ? <div className="text-sm text-slate-700 dark:text-slate-200">{tr("讀取中…", "读取中…", "Loading…")}</div> : null}
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
      {ok ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{ok}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={tr("基本資料", "基本资料", "Basics")}>
          <Field label={tr("機場中文名", "机场中文名", "Chinese name")}>
            <Input value={form.nameZh} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, nameZh: v }))} placeholder={tr("北京首都國際機場", "北京首都国际机场", "Beijing Capital International Airport")} />
          </Field>
          <Field label={tr("機場英文名", "机场英文名", "English name")}>
            <Input value={form.nameEn} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, nameEn: v }))} placeholder="Beijing Capital International Airport" />
          </Field>
          <Field
            label={tr("關鍵字/別名（逗號分隔）", "关键词/别名（逗号分隔）", "Aliases/keywords (comma separated)")}
            hint={tr("例：", "例：", "e.g.")}
            example="羽田國際機場, 羽田国际机场, HND, Haneda, Tokyo"
          >
            <Input value={keywordsText} disabled={!canEdit} onChange={setKeywordsText} placeholder="HND, Haneda, Tokyo" />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={tr("IATA（3碼）", "IATA（3位）", "IATA (3 letters)")}>
              <Input value={form.iata ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, iata: v || null }))} placeholder="PEK" />
            </Field>
            <Field label={tr("ICAO（4碼）", "ICAO（4位）", "ICAO (4 letters)")}>
              <Input value={form.icao ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, icao: v || null }))} placeholder="ZBAA" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={tr("國家", "国家", "Country")}>
              <Input value={form.country ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, country: v || null }))} placeholder={tr("中國", "中国", "China")} />
            </Field>
            <Field label={tr("省/直轄市/自治區", "省/直辖市/自治区", "Province/State")}>
              <Input value={form.province ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, province: v || null }))} placeholder={tr("北京市 / 河北省 / …", "北京市 / 河北省 / …", "Beijing / Hebei / …")} />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={tr("城市", "城市", "City")}>
              <Input value={form.city ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, city: v || null }))} placeholder={tr("北京市", "北京市", "Beijing")} />
            </Field>
            <Field label={tr("啟用日期（YYYY-MM-DD）", "启用日期（YYYY-MM-DD）", "Opened on (YYYY-MM-DD)")}>
              <Input value={form.openedOn ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, openedOn: v || null }))} placeholder="2019-09-25" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label={tr("指標/等級（如 4F）", "指标/等级（如 4F）", "Category (e.g. 4F)")}>
              <Input value={form.category ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, category: v || null }))} placeholder="4F" />
            </Field>
            <Field label={tr("性質（civil/mixed/military）", "性质（civil/mixed/military）", "Nature (civil/mixed/military)")}>
              <Input value={form.nature ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, nature: v || null }))} placeholder="civil" />
            </Field>
            <Field label={tr("標高（m）", "标高（m）", "Elevation (m)")}>
              <NumberInput
                value={form.elevationM}
                disabled={!canEdit}
                onChange={(n) => setForm((s) => ({ ...s, elevationM: n }))}
                placeholder="35"
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label={tr("時區", "时区", "Timezone")}>
              <Input value={form.timezone ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, timezone: v || null }))} placeholder="Asia/Shanghai" />
            </Field>
            <Field label={tr("緯度", "纬度", "Latitude")}>
              <NumberInput value={form.lat} disabled={!canEdit} onChange={(n) => setForm((s) => ({ ...s, lat: n }))} placeholder="40.0801" />
            </Field>
            <Field label={tr("經度", "经度", "Longitude")}>
              <NumberInput value={form.lon} disabled={!canEdit} onChange={(n) => setForm((s) => ({ ...s, lon: n }))} placeholder="116.5846" />
            </Field>
          </div>
        </Card>

        <Card title={tr("機場資訊（JSON）", "机场信息（JSON）", "Airport info (JSON)")}>
          <Field label={tr("機場介紹（intro）", "机场介绍（intro）", "Intro (intro)")} hint={tr("會顯示在前台機場詳頁", "会显示在前台机场详情页", "Shown on public airport page")}>
            <Textarea
              value={form.intro ?? ""}
              disabled={!canEdit}
              onChange={(v) => setForm((s) => ({ ...s, intro: v || null }))}
              placeholder={tr("請輸入機場介紹、定位、亮點、航廈配置、聯外交通等。", "请输入机场介绍、定位、亮点、航站楼配置、交通等。", "Write an introduction: highlights, terminals, transportation…")}
            />
          </Field>
          <Field label={tr("自訂重點（factsJson）", "自定义重点（factsJson）", "Key facts (factsJson)")} hint={tr("例：", "例：", "e.g.")} example={EX_FACTS}>
            <Textarea
              value={form.factsJson ?? ""}
              disabled={!canEdit}
              onChange={(v) => setForm((s) => ({ ...s, factsJson: v || null }))}
              placeholder={EX_FACTS}
            />
          </Field>
          <Field label={tr("航站樓（terminalsJson）", "航站楼（terminalsJson）", "Terminals (terminalsJson)")} hint={tr("例：", "例：", "e.g.")} example={EX_TERMINALS}>
            <Textarea value={form.terminalsJson ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, terminalsJson: v || null }))} placeholder={EX_TERMINALS} />
          </Field>
          <Field label={tr("跑道（runwaysJson）", "跑道（runwaysJson）", "Runways (runwaysJson)")} hint={tr("例：", "例：", "e.g.")} example={EX_RUNWAYS}>
            <Textarea value={form.runwaysJson ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, runwaysJson: v || null }))} placeholder={EX_RUNWAYS} />
          </Field>
          <Field label={tr("航空公司（airlinesJson）", "航空公司（airlinesJson）", "Airlines (airlinesJson)")} hint={tr("例：", "例：", "e.g.")} example={EX_AIRLINES}>
            <Textarea value={form.airlinesJson ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, airlinesJson: v || null }))} placeholder={EX_AIRLINES} />
          </Field>
          <Field label={tr("商業航班量/吞吐（trafficJson）", "商业航班量/吞吐（trafficJson）", "Traffic (trafficJson)")} hint={tr("例：", "例：", "e.g.")} example={EX_TRAFFIC}>
            <Textarea value={form.trafficJson ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, trafficJson: v || null }))} placeholder={EX_TRAFFIC} />
          </Field>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={tr("圖片（URL 陣列 JSON）", "图片（URL 数组 JSON）", "Images (URL array JSON)")}>
          <Field label={tr("機場照片（photosJson）", "机场照片（photosJson）", "Photos (photosJson)")} hint={tr("例：", "例：", "e.g.")} example={EX_PHOTOS}>
            <Textarea value={form.photosJson ?? ""} disabled={!canEdit} onChange={(v) => setForm((s) => ({ ...s, photosJson: v || null }))} placeholder={EX_PHOTOS} />
          </Field>
          <Field label={tr("滑行道/跑道圖片（taxiwayPhotosJson）", "滑行道/跑道图片（taxiwayPhotosJson）", "Taxiway/runway (taxiwayPhotosJson)")} hint={tr("例：", "例：", "e.g.")} example={EX_PHOTOS}>
            <Textarea
              value={form.taxiwayPhotosJson ?? ""}
              disabled={!canEdit}
              onChange={(v) => setForm((s) => ({ ...s, taxiwayPhotosJson: v || null }))}
              placeholder={EX_PHOTOS}
            />
          </Field>
        </Card>

        <Card title={tr("備註", "备注", "Notes")}>
          <Field label={tr("補充說明（notes）", "补充说明（notes）", "Notes (notes)")}>
            <Textarea
              value={form.notes ?? ""}
              disabled={!canEdit}
              onChange={(v) => setForm((s) => ({ ...s, notes: v || null }))}
              placeholder={tr("可填跑道關閉、航站樓分區、外部連結等。", "可填写跑道关闭、航站楼分区、外部链接等。", "Runway closures, terminal zones, external links…")}
            />
          </Field>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600 dark:text-slate-300">
          {canEdit
            ? tr("你有編輯權限（管理員以上）", "你有编辑权限（管理员以上）", "You have edit permission (Admin+).")
            : tr("你目前為只讀（審核員可看但不可修改）", "你目前为只读（审核员可看但不可修改）", "Read-only (reviewers can view but cannot edit).")}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!canEdit || saving}
          className={[
            "rounded-xl px-4 py-2 text-sm font-semibold",
            !canEdit || saving
              ? "cursor-not-allowed border border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5"
              : "bg-sky-500 text-sky-950 hover:bg-sky-400",
          ].join(" ")}
        >
          {saving ? tr("儲存中…", "保存中…", "Saving…") : tr("儲存", "保存", "Save")}
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  example,
  children,
}: {
  label: string;
  hint?: string;
  example?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</div>
        {hint && example ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              navigator.clipboard?.writeText(example).catch(() => {});
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-sky-950/30 dark:text-slate-200 dark:hover:bg-sky-950/40"
          >
            {hint}
          </button>
        ) : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white dark:focus:border-sky-400/40"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={typeof value === "number" ? String(value) : ""}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (!raw) return onChange(null);
        const n = Number(raw);
        onChange(Number.isFinite(n) ? n : null);
      }}
      placeholder={placeholder}
      disabled={disabled}
      inputMode="decimal"
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/40 dark:text-white dark:focus:border-sky-400/40"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={6}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-400/60 disabled:opacity-60 dark:border-white/10 dark:bg-sky-950/40 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-sky-400/40"
    />
  );
}

