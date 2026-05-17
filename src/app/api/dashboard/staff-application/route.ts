import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

const ALLOWED_TRACKS = new Set(["TOGA", "Planespotter", "APJP"]);

function normalizeTracks(input: unknown) {
  const arr = Array.isArray(input) ? input : [];
  const out: string[] = [];
  for (const v of arr) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s && ALLOWED_TRACKS.has(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.roleId >= 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const approvedCount = await prisma.photo.count({ where: { userId: user.id, status: "approved" } });
  if (approvedCount <= 100) return NextResponse.json({ error: "not_eligible" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { tracks?: unknown };
  const tracks = normalizeTracks(body.tracks);
  if (!tracks.length) return NextResponse.json({ error: "tracks_required" }, { status: 400 });

  const existingDraft = await prisma.staffApplication.findFirst({
    where: { userId: user.id, status: "draft" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const application = existingDraft
    ? await prisma.staffApplication.update({
        where: { id: existingDraft.id },
        data: { tracksJson: JSON.stringify(tracks) },
        select: { id: true, status: true, tracksJson: true, imagesJson: true, answersJson: true, submittedAt: true, createdAt: true, updatedAt: true },
      })
    : await prisma.staffApplication.create({
        data: { userId: user.id, status: "draft", tracksJson: JSON.stringify(tracks) },
        select: { id: true, status: true, tracksJson: true, imagesJson: true, answersJson: true, submittedAt: true, createdAt: true, updatedAt: true },
      });

  return NextResponse.json({ ok: true, application });
}

