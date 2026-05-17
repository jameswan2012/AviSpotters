import { prisma } from "@/lib/db";

const GENERIC_PATTERNS = [
  /^(无留言|無留言|沒留言|没留言|none|n\/a|na)$/i,
  /^(正确拒绝|正確拒絕)$/i,
  /^(同上|如上)$/i,
  /^(ok|okay|通过|通過|拒绝|拒絕)$/i,
];

export function isWeakReviewReply(raw: string | null | undefined) {
  const text = String(raw ?? "").trim();
  if (!text) return true;
  const compact = text.replace(/\s+/g, "");
  return GENERIC_PATTERNS.some((re) => re.test(text) || re.test(compact));
}

export async function notifyAdminsForWeakReply(params: {
  kind: "photo_reject" | "appeal_dismiss";
  targetId: string;
  reviewerId: string;
  reviewerEmail?: string | null;
  reply: string;
}) {
  const title =
    params.kind === "photo_reject"
      ? `[系统提醒] 审核拒绝留言过弱（图片 ${params.targetId}）`
      : `[系统提醒] 申诉驳回留言过弱（申诉 ${params.targetId}）`;
  const body =
    `${title}\n` +
    `reviewerId=${params.reviewerId}\n` +
    `reviewerEmail=${params.reviewerEmail ?? "-"}\n` +
    `reply=${params.reply || "(empty)"}\n` +
    `time=${new Date().toISOString()}`;

  await prisma.ticket.create({
    data: {
      email: "system@avispotters.local",
      body,
      status: "open",
      staffReply: null,
      resolvedById: null,
      resolvedAt: null,
    },
  });
}
