import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.roleId >= 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const approvedCount = await prisma.photo.count({ where: { userId: user.id, status: "approved" } });
  if (approvedCount <= 100) return NextResponse.json({ error: "not_eligible" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    applicationId?: string;
    answers?: Array<{ questionId?: string; answer?: string }>;
  };

  const applicationId = typeof body.applicationId === "string" ? body.applicationId.trim() : "";
  if (!applicationId) return NextResponse.json({ error: "applicationId_required" }, { status: 400 });

  const app = await prisma.staffApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, status: true, tracksJson: true, imagesJson: true },
  });
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (app.userId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (app.status !== "draft") return NextResponse.json({ error: "not_editable" }, { status: 409 });

  const tracks = safeParse<string[]>(app.tracksJson, []);
  if (!tracks.length) return NextResponse.json({ error: "tracks_required" }, { status: 400 });
  const images = safeParse<any[]>(app.imagesJson, []);
  if (!images.length) return NextResponse.json({ error: "images_required" }, { status: 400 });

  const qs = await prisma.staffApplicationQuestion.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const qIds = new Set(qs.map((q) => q.id));

  const inputAnswers = Array.isArray(body.answers) ? body.answers : [];
  const out: Array<{ questionId: string; answer: string }> = [];
  for (const a of inputAnswers) {
    const qid = typeof a?.questionId === "string" ? a.questionId.trim() : "";
    const ans = typeof a?.answer === "string" ? a.answer.trim() : "";
    if (!qid || !qIds.has(qid)) continue;
    out.push({ questionId: qid, answer: ans.slice(0, 4000) });
  }

  // Require answers for all configured questions (if any).
  if (qs.length) {
    const answered = new Set(out.filter((x) => x.answer).map((x) => x.questionId));
    for (const q of qs) {
      if (!answered.has(q.id)) return NextResponse.json({ error: "answers_required" }, { status: 400 });
    }
  }

  const now = new Date();
  const application = await prisma.staffApplication.update({
    where: { id: applicationId },
    data: { answersJson: JSON.stringify(out), status: "submitted", submittedAt: now },
    select: { id: true, status: true, tracksJson: true, imagesJson: true, answersJson: true, submittedAt: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, application });
}

