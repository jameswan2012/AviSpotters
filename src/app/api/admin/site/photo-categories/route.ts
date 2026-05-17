import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { toRoleId } from "@/lib/roles";
import { DEFAULT_PHOTO_CATEGORY_SETTING, type PhotoCategoryGroup, type PhotoCategorySetting } from "@/lib/photo-categories";
import { getPhotoCategorySetting, setPhotoCategorySetting } from "@/lib/site-settings";

function isGroup(v: unknown): v is PhotoCategoryGroup {
  return v === "domain" || v === "tag" || v === "exclusive" || v === "legacy";
}

function normalizeSetting(input: any): PhotoCategorySetting | null {
  const rawCats = input?.categories;
  if (!Array.isArray(rawCats)) return null;
  const cats = rawCats
    .map((c) => {
      const id = typeof c?.id === "string" ? c.id.trim() : "";
      const group = c?.group;
      if (!id || !isGroup(group)) return null;
      const zhHant = typeof c?.zhHant === "string" ? c.zhHant : id;
      const zhHans = typeof c?.zhHans === "string" ? c.zhHans : id;
      const en = typeof c?.en === "string" ? c.en : id;
      const enabled = c?.enabled === false ? false : true;
      return { id, group, zhHant, zhHans, en, enabled };
    })
    .filter(Boolean) as any[];

  // ID uniqueness
  const ids = cats.map((c) => c.id);
  const uniq = new Set(ids);
  if (uniq.size !== ids.length) return null;

  // Domain must include the two required options and both enabled.
  const domain = cats.filter((c) => c.group === "domain");
  const domainIds = new Set(domain.map((c) => c.id));
  if (!domainIds.has("domain_civil") || !domainIds.has("domain_military")) return null;
  const civil = domain.find((c) => c.id === "domain_civil");
  const mil = domain.find((c) => c.id === "domain_military");
  if (civil?.enabled === false || mil?.enabled === false) return null;

  return { version: 1, categories: cats };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const setting = await getPhotoCategorySetting();
  return NextResponse.json({ setting });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roleId = toRoleId(user.roleId);
  if (roleId < 4) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as any;
  const next = normalizeSetting(body?.setting);
  if (!next) return NextResponse.json({ error: "invalid setting" }, { status: 400 });

  await setPhotoCategorySetting({ setting: next ?? DEFAULT_PHOTO_CATEGORY_SETTING, updatedById: user.id });
  return NextResponse.json({ ok: true });
}

