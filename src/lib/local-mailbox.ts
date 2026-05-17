import path from "path";
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import crypto from "crypto";

export type LocalMailItem = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  createdAt: string;
};

function mailboxDir() {
  const env = (process.env.LOCAL_MAIL_DIR || "").trim();
  if (env) return env;
  return path.join(process.cwd(), ".local-mailbox");
}

function isLocalMailboxEnabled() {
  return process.env.LOCAL_MAIL_MODE === "1" || process.env.NODE_ENV !== "production";
}

function filenameOf(id: string) {
  return `${id}.json`;
}

export async function saveLocalMail(input: Omit<LocalMailItem, "id" | "createdAt">) {
  if (!isLocalMailboxEnabled()) return null;
  const dir = mailboxDir();
  await mkdir(dir, { recursive: true });
  const id = crypto.randomUUID();
  const item: LocalMailItem = {
    id,
    to: String(input.to || "").trim(),
    subject: String(input.subject || "").trim(),
    text: String(input.text || ""),
    html: typeof input.html === "string" ? input.html : undefined,
    createdAt: new Date().toISOString(),
  };
  const abs = path.join(dir, filenameOf(id));
  await writeFile(abs, JSON.stringify(item, null, 2), "utf8");
  return item;
}

export async function listLocalMails(limit = 100): Promise<LocalMailItem[]> {
  const dir = mailboxDir();
  const names = await readdir(dir).catch(() => []);
  const jsons = names.filter((n) => n.endsWith(".json")).slice(-Math.max(1, Math.min(1000, limit)));
  const rows: LocalMailItem[] = [];
  for (const name of jsons) {
    const abs = path.join(dir, name);
    try {
      const raw = await readFile(abs, "utf8");
      const parsed = JSON.parse(raw) as LocalMailItem;
      if (!parsed?.id || !parsed?.createdAt) continue;
      rows.push(parsed);
    } catch {
      // ignore broken file
    }
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

export async function clearLocalMails() {
  const dir = mailboxDir();
  const names = await readdir(dir).catch(() => []);
  await Promise.all(
    names
      .filter((n) => n.endsWith(".json"))
      .map((n) => rm(path.join(dir, n), { force: true }))
  );
}

