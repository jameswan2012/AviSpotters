import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

function normalizeQ(q: string | null) {
  return (q ?? "").trim();
}

function normalizeSort(v: string | undefined) {
  const s = (v ?? "").trim();
  if (s === "registration" || s === "aircraftModel" || s === "airline" || s === "msn" || s === "updatedAt") return s;
  return "updatedAt";
}

function normalizeDir(v: string | undefined) {
  const s = (v ?? "").trim().toLowerCase();
  return s === "asc" ? "asc" : "desc";
}

function regPrefix(reg: string) {
  const r = (reg ?? "").trim().toUpperCase();
  if (!r) return "—";
  const dash = r.indexOf("-");
  if (dash > 0) return r.slice(0, dash);
  const m = r.match(/^[A-Z]+/);
  return m?.[0] ?? r.slice(0, 1);
}

export default async function AircraftSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; group?: string }>;
}) {
  const locale = await getServerLocaleOnly();
  const sp = await searchParams;
  const q = normalizeQ(sp.q ?? null);
  const query = q.toUpperCase();
  const sort = normalizeSort(sp.sort);
  const dir = normalizeDir(sp.dir);
  const group = !q && (sp.group ?? "1") !== "0";

  const orderBy = group
    ? [{ registration: "asc" as const }, { updatedAt: "desc" as const }]
    : sort === "registration"
      ? [{ registration: dir as "asc" | "desc" }, { updatedAt: "desc" as const }]
      : sort === "aircraftModel"
        ? [{ aircraftModel: dir as "asc" | "desc" }, { registration: "asc" as const }]
        : sort === "airline"
          ? [{ airline: dir as "asc" | "desc" }, { registration: "asc" as const }]
          : sort === "msn"
            ? [{ msn: dir as "asc" | "desc" }, { registration: "asc" as const }]
            : [{ updatedAt: dir as "asc" | "desc" }, { registration: "asc" as const }];

  const results = await prisma.aircraftRegistration.findMany({
    where: q
      ? {
          OR: [
            { registration: { contains: query } },
            { aircraftModel: { contains: q } },
            { airline: { contains: q } },
            { msn: { contains: q } },
          ],
        }
      : undefined,
    orderBy,
    take: group ? 400 : 120,
    select: { registration: true, aircraftModel: true, airline: true, msn: true, updatedAt: true },
  });

  const title = locale === "en" ? "Aircraft database" : locale === "zh-Hans" ? "飞机数据库" : "飛機資料庫";
  const desc =
    locale === "en"
      ? "Search by registration, model, airline or MSN."
      : locale === "zh-Hans"
        ? "可按注册号 / 机型 / 航司 / MSN 搜索。"
        : "可按註冊號 / 機型 / 航司 / MSN 搜尋。";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{desc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/aircraft/submit"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {locale === "en" ? "Submit data" : locale === "zh-Hans" ? "提交数据" : "提交資料"}
            </Link>
          </div>
        </div>

        <form className="mt-5 grid gap-3 sm:grid-cols-12" action="/aircraft" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder={locale === "en" ? "B-32A1 / A359 / Air China…" : locale === "zh-Hans" ? "B-32A1 / A359 / 国航…" : "B-32A1 / A359 / 國航…"}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/50 dark:text-slate-100 sm:col-span-6"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/50 dark:text-slate-100 sm:col-span-3"
          >
            <option value="updatedAt">{locale === "en" ? "Updated" : locale === "zh-Hans" ? "更新" : "更新"}</option>
            <option value="registration">{locale === "en" ? "Registration" : locale === "zh-Hans" ? "注册号" : "註冊號"}</option>
            <option value="aircraftModel">{locale === "en" ? "Model" : locale === "zh-Hans" ? "机型" : "機型"}</option>
            <option value="airline">{locale === "en" ? "Airline" : locale === "zh-Hans" ? "航司" : "航司"}</option>
            <option value="msn">MSN</option>
          </select>
          <select
            name="dir"
            defaultValue={dir}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400/60 dark:border-white/10 dark:bg-sky-950/50 dark:text-slate-100 sm:col-span-2"
          >
            <option value="desc">{locale === "en" ? "Desc" : locale === "zh-Hans" ? "降序" : "降序"}</option>
            <option value="asc">{locale === "en" ? "Asc" : locale === "zh-Hans" ? "升序" : "升序"}</option>
          </select>
          <input type="hidden" name="group" value={group ? "1" : "0"} />
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-sky-500 px-5 text-sm font-semibold text-sky-950 hover:bg-sky-400 sm:col-span-1"
          >
            {locale === "en" ? "Search" : locale === "zh-Hans" ? "搜索" : "搜尋"}
          </button>
        </form>

        {!q ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-300">{locale === "en" ? "Grouping:" : locale === "zh-Hans" ? "分组：" : "分組："}</span>
            <Link
              href={`/aircraft?sort=${encodeURIComponent(sort)}&dir=${encodeURIComponent(dir)}&group=1`}
              className={[
                "rounded-lg border px-2.5 py-1 text-xs font-semibold",
                group
                  ? "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {locale === "en" ? "By prefix" : locale === "zh-Hans" ? "按前缀" : "按前綴"}
            </Link>
            <Link
              href={`/aircraft?sort=${encodeURIComponent(sort)}&dir=${encodeURIComponent(dir)}&group=0`}
              className={[
                "rounded-lg border px-2.5 py-1 text-xs font-semibold",
                !group
                  ? "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {locale === "en" ? "Flat list" : locale === "zh-Hans" ? "列表" : "列表"}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        {group ? (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {Array.from(
              results.reduce((map, r) => {
                const k = regPrefix(r.registration);
                const arr = map.get(k) ?? [];
                arr.push(r);
                map.set(k, arr);
                return map;
              }, new Map<string, typeof results>())
            )
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([k, arr]) => (
                <div key={k} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {k} <span className="ml-1 text-xs font-normal text-slate-600 dark:text-slate-300">({arr.length})</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-3">{locale === "en" ? "Registration" : locale === "zh-Hans" ? "注册号" : "註冊號"}</th>
                          <th className="px-4 py-3">{locale === "en" ? "Model" : locale === "zh-Hans" ? "机型" : "機型"}</th>
                          <th className="px-4 py-3">{locale === "en" ? "Airline" : locale === "zh-Hans" ? "航司" : "航司"}</th>
                          <th className="px-4 py-3">MSN</th>
                          <th className="px-4 py-3">{locale === "en" ? "Updated" : locale === "zh-Hans" ? "更新" : "更新"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arr.map((r) => (
                          <tr key={r.registration} className="border-t border-slate-200 dark:border-white/10">
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                              <Link href={`/aircraft/${encodeURIComponent(r.registration)}`} className="hover:underline">
                                {r.registration}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.aircraftModel ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.airline ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.msn ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{r.updatedAt.toISOString().slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">{locale === "en" ? "Registration" : locale === "zh-Hans" ? "注册号" : "註冊號"}</th>
                  <th className="px-4 py-3">{locale === "en" ? "Model" : locale === "zh-Hans" ? "机型" : "機型"}</th>
                  <th className="px-4 py-3">{locale === "en" ? "Airline" : locale === "zh-Hans" ? "航司" : "航司"}</th>
                  <th className="px-4 py-3">MSN</th>
                  <th className="px-4 py-3">{locale === "en" ? "Updated" : locale === "zh-Hans" ? "更新" : "更新"}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.registration} className="border-t border-slate-200 dark:border-white/10">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      <Link href={`/aircraft/${encodeURIComponent(r.registration)}`} className="hover:underline">
                        {r.registration}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.aircraftModel ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.airline ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.msn ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{r.updatedAt.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!results.length ? (
          <div className="p-6 text-sm text-slate-700 dark:text-slate-200">
            {locale === "en" ? "No results." : locale === "zh-Hans" ? "暂无结果。" : "暫無結果。"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

