import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getSiteFooterSettingAdminView, setSiteFooterSetting, type SiteFooterContactLink, type SiteFooterFriendLink } from "@/lib/site-settings";

export async function GET() {
  await requireSuperAdmin();
  const footer = await getSiteFooterSettingAdminView();
  return NextResponse.json({ footer });
}

export async function POST(request: Request) {
  const { user } = await requireSuperAdmin();
  const body = (await request.json().catch(() => ({}))) as Partial<{ icp: string | null; contactLinks: SiteFooterContactLink[]; friendLinks: SiteFooterFriendLink[] }>;
  const icp = typeof body.icp === "string" ? body.icp : null;
  const contactLinks = Array.isArray(body.contactLinks) ? (body.contactLinks as SiteFooterContactLink[]) : [];
  const friendLinks = Array.isArray(body.friendLinks) ? (body.friendLinks as SiteFooterFriendLink[]) : [];
  await setSiteFooterSetting({ icp, contactLinks, friendLinks, updatedById: user.id });
  const footer = await getSiteFooterSettingAdminView();
  return NextResponse.json({ ok: true, footer });
}

