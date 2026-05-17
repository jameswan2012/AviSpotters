import fs from "node:fs/promises";
import path from "node:path";

export type AiFeedbackEvent =
  | "dust_false_positive"
  | "dust_manual_positive"
  | "dust_all_false_positive"
  | "smart_suggestion_correct"
  | "smart_suggestion_wrong";

export type AiFeedbackPayload = {
  photoId: string;
  imageUrl: string;
  event: AiFeedbackEvent;
  locale?: string;
  marker?: { x: number; y: number; r: number; source: "detected" | "manual" };
  suggestionKey?: string;
  note?: string;
};

function feedbackFilePath() {
  return path.join(process.cwd(), "var", "ai-training-feedback.jsonl");
}

export async function appendAiTrainingFeedback(params: {
  userId: string;
  roleId: number;
  payload: AiFeedbackPayload;
}) {
  const file = feedbackFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const row = {
    ts: new Date().toISOString(),
    userId: params.userId,
    roleId: params.roleId,
    ...params.payload,
  };
  await fs.appendFile(file, `${JSON.stringify(row)}\n`, "utf8");
}
