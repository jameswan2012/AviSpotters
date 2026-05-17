import { NextResponse } from "next/server";
import { computeLeaderboard, getLeaderboard, getLocalizedText, resolveRange } from "@/lib/custom-leaderboards";
import { getServerLocaleOnly } from "@/i18n/server";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const locale = await getServerLocaleOnly();
  const { id } = await ctx.params;
  const def = await getLeaderboard(id);
  if (!def || !def.enabled) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rows = await computeLeaderboard(def);
  const title = getLocalizedText(locale, def.titleJson, "Leaderboard");
  const desc = def.descJson ? getLocalizedText(locale, def.descJson, "") : "";
  const { since, start, end } = resolveRange(def);
  const hint = since ? def.rangeKey : start || end ? "custom" : "all";

  return NextResponse.json({
    leaderboard: {
      id: def.id,
      title,
      desc,
      hint,
      rows: rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        approved: r.approved,
        rejected: r.rejected,
        passRate: r.passRate,
      })),
    },
  });
}

