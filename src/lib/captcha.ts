import crypto from "crypto";
import { prisma } from "@/lib/db";
import sharp from "sharp";

const CAPTCHA_EXPIRE_MS = 5 * 60 * 1000;
const CAPTCHA_LEN = 5;
const CAPTCHA_MAX_ATTEMPTS = 10;

function now() {
  return new Date();
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function pepper() {
  return (process.env.CAPTCHA_PEPPER || process.env.EMAIL_OTP_PEPPER || process.env.JWT_SECRET || "avispotters-captcha-pepper").trim();
}

function hashAnswer(params: { answer: string; salt: string }) {
  return sha256Hex(`${pepper()}:${params.salt}:${params.answer.toUpperCase()}`);
}

function randomText() {
  // Avoid confusing chars: 0 O, 1 I, l
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < CAPTCHA_LEN; i++) {
    s += alphabet[crypto.randomInt(0, alphabet.length)]!;
  }
  return s;
}

function svgEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderCaptchaSvg(text: string) {
  const w = 160;
  const h = 56;
  const bg = "#0b1220";
  const fg = "#e2e8f0";
  const noise = "#38bdf8";

  const chars = text.split("");
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = svgEscape(chars[i] ?? "");
    const x = 20 + i * 26 + crypto.randomInt(-2, 3);
    const y = 36 + crypto.randomInt(-3, 4);
    const rot = crypto.randomInt(-18, 19);
    const scale = (100 + crypto.randomInt(-4, 5)) / 100;
    parts.push(
      `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y}) scale(${scale})" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" font-weight="800" fill="${fg}">${ch}</text>`
    );
  }

  const lines: string[] = [];
  for (let i = 0; i < 6; i++) {
    const x1 = crypto.randomInt(0, w);
    const y1 = crypto.randomInt(0, h);
    const x2 = crypto.randomInt(0, w);
    const y2 = crypto.randomInt(0, h);
    const op = (40 + crypto.randomInt(0, 35)) / 100;
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${noise}" stroke-opacity="${op}" stroke-width="2"/>`);
  }

  const dots: string[] = [];
  for (let i = 0; i < 45; i++) {
    const cx = crypto.randomInt(0, w);
    const cy = crypto.randomInt(0, h);
    const r = crypto.randomInt(1, 3);
    const op = (15 + crypto.randomInt(0, 25)) / 100;
    dots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${noise}" fill-opacity="${op}"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="0.4"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" rx="14" fill="url(#g)"/>
  ${lines.join("\n")}
  ${dots.join("\n")}
  <g filter="url(#blur)">
    ${parts.join("\n")}
  </g>
</svg>`;
}

export async function createCaptcha(params: { ip: string | null; userAgent: string | null }) {
  const answer = randomText();
  const salt = crypto.randomBytes(16).toString("hex");
  const answerHash = hashAnswer({ answer, salt });
  const expiresAt = new Date(Date.now() + CAPTCHA_EXPIRE_MS);
  const row = await prisma.captchaChallenge.create({
    data: {
      answerHash,
      salt,
      expiresAt,
      ip: params.ip,
      userAgent: params.userAgent,
    },
    select: { id: true, expiresAt: true },
  });
  const svg = renderCaptchaSvg(answer);
  let dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  try {
    // iOS UIImage doesn't decode SVG directly; provide PNG for mobile clients.
    const png = await sharp(Buffer.from(svg, "utf8")).png({ compressionLevel: 9 }).toBuffer();
    dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // keep svg fallback for environments where sharp conversion fails
  }
  return { id: row.id, expiresAt: row.expiresAt.toISOString(), dataUrl };
}

export async function verifyCaptcha(params: { captchaId: string; code: string }) {
  const id = String(params.captchaId || "").trim();
  const code = String(params.code || "").trim().toUpperCase();
  if (!id) throw new Error("captcha_required");
  if (!code) throw new Error("captcha_code_required");
  if (!/^[A-Z0-9]{4,8}$/.test(code)) throw new Error("captcha_code_invalid");

  const row = await prisma.captchaChallenge.findUnique({
    where: { id },
    select: { id: true, answerHash: true, salt: true, expiresAt: true, usedAt: true, attempts: true },
  });
  if (!row) throw new Error("captcha_expired");
  if (row.usedAt) throw new Error("captcha_used");
  if (row.expiresAt.getTime() <= Date.now()) throw new Error("captcha_expired");
  if (row.attempts >= CAPTCHA_MAX_ATTEMPTS) throw new Error("captcha_too_many_attempts");

  const ok = hashAnswer({ answer: code, salt: row.salt }) === row.answerHash;
  if (!ok) {
    await prisma.captchaChallenge.update({ where: { id: row.id }, data: { attempts: { increment: 1 } }, select: { id: true } });
    throw new Error("captcha_wrong");
  }

  await prisma.captchaChallenge.update({ where: { id: row.id }, data: { usedAt: now() }, select: { id: true } });
  return { ok: true as const };
}

