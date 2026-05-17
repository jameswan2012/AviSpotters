#!/usr/bin/env node
/* eslint-disable no-console */
const nodemailer = require("nodemailer");

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith("--")) return "";
  return v;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function envTrim(key, fallback = "") {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : fallback;
}

function usage() {
  console.log(`
用法：
  SMTP_HOST=smtp.qiye.aliyun.com SMTP_PORT=465 SMTP_USER="user@domain" SMTP_PASS="app_pass" SMTP_FROM="user@domain" \\
  node scripts/smtp-send.cjs --to "to@example.com" --subject "test" --text "hello" --debug

參數（可用 env 或旗標覆蓋）：
  env: SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM
  flags:
    --host --port --user --pass --from --to --subject --text
    --debug   (印出 SMTP 對話)
    --verify  (先做 transporter.verify)
`);
}

async function main() {
  if (flag("help") || flag("h")) return usage();

  const host = arg("host") ?? envTrim("SMTP_HOST");
  const port = Number(arg("port") ?? envTrim("SMTP_PORT", "465")) || 0;
  const user = arg("user") ?? envTrim("SMTP_USER");
  const pass = arg("pass") ?? envTrim("SMTP_PASS");
  const from = arg("from") ?? envTrim("SMTP_FROM") ?? "";
  const to = arg("to") ?? "";
  const subject = arg("subject") ?? "AviSpotters SMTP test";
  const text = arg("text") ?? `Test email sent at ${new Date().toISOString()}`;

  if (!host || !port || !user || !pass || !to) {
    console.error("缺少必要參數：host/port/user/pass/to");
    return usage();
  }

  const secure = port === 465; // 465 = SMTPS
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure, // 587: STARTTLS
    auth: { user, pass },
    tls: { servername: host, minVersion: "TLSv1.2" },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    logger: flag("debug"),
    debug: flag("debug"),
  });

  if (flag("verify")) {
    await transport.verify();
    console.log("OK: SMTP verify passed");
  }

  const info = await transport.sendMail({
    from: from || user,
    to,
    subject,
    text,
  });

  console.log("OK: sent");
  console.log({
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    pending: info.pending,
    response: info.response,
  });
}

main().catch((e) => {
  console.error("FAILED:", e && e.message ? e.message : e);
  if (e && typeof e === "object") {
    const extra = {
      code: e.code,
      command: e.command,
      responseCode: e.responseCode,
      response: e.response,
    };
    console.error(extra);
  }
  process.exit(1);
});

