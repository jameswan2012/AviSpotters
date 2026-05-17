import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerLocaleOnly } from "@/i18n/server";

export async function POST(request: Request) {
  const locale = await getServerLocaleOnly();
  const tr = (zhHant: string, zhHans: string, en: string) => (locale === "en" ? en : locale === "zh-Hans" ? zhHans : zhHant);

  const body = (await request.json().catch(() => ({}))) as Partial<{ email: string; body: string }>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!email || !email.includes("@")) return NextResponse.json({ error: tr("請填寫有效 Email", "请填写有效 Email", "Please enter a valid email") }, { status: 400 });
  if (!text) return NextResponse.json({ error: tr("請填寫內容", "请填写内容", "Please enter a message") }, { status: 400 });
  if (email.length > 200) return NextResponse.json({ error: tr("Email 太長", "Email 太长", "Email too long") }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: tr("內容太長（最多 5000 字）", "内容太长（最多 5000 字）", "Message too long (max 5000)") }, { status: 400 });

  const row = await prisma.ticket.create({
    data: { email, body: text, status: "open" },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: row.id });
}

