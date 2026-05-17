import { NextResponse } from "next/server";
import { getActiveNews } from "@/lib/site-settings";

export async function GET() {
  const news = await getActiveNews();
  return NextResponse.json({
    uptimeStartIso: "2026-02-24T00:00:00.000Z",
    news: news
      ? {
          id: news.id,
          title: news.title,
          body: news.body,
          imageUrl: news.imageUrl,
        }
      : null,
  });
}

