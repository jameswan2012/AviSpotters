#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, "var", "sensitive-lexicon");
const REPO_DIR = path.join(BASE_DIR, "upstream");
const OUT_FILE = path.join(BASE_DIR, "words.txt");
const REPO_URL = "https://github.com/konsheng/Sensitive-lexicon.git";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

function syncRepo() {
  ensureDir(BASE_DIR);
  if (!fs.existsSync(path.join(REPO_DIR, ".git"))) {
    run(`git clone --depth=1 "${REPO_URL}" "${REPO_DIR}"`, ROOT);
    return;
  }
  run("git fetch --depth=1 origin main", REPO_DIR);
  run("git checkout -f main", REPO_DIR);
  run("git reset --hard origin/main", REPO_DIR);
}

function collectTxtFiles(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTxtFiles(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".txt")) {
      out.push(full);
    }
  }
}

function normalizeWord(raw) {
  const v = String(raw || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
  if (!v) return "";
  if (v.startsWith("#") || v.startsWith("//") || v.startsWith(";")) return "";
  if (v.length < 2 || v.length > 64) return "";
  return v;
}

function buildLexicon() {
  const targets = [
    path.join(REPO_DIR, "Organized"),
    path.join(REPO_DIR, "Vocabulary"),
  ];
  const txtFiles = [];
  for (const p of targets) {
    if (fs.existsSync(p)) collectTxtFiles(p, txtFiles);
  }
  const words = new Set();
  for (const file of txtFiles) {
    const raw = fs.readFileSync(file, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const word = normalizeWord(line);
      if (word) words.add(word);
    }
  }
  const arr = Array.from(words).sort((a, b) => b.length - a.length || a.localeCompare(b));
  ensureDir(path.dirname(OUT_FILE));
  fs.writeFileSync(OUT_FILE, `${arr.join("\n")}\n`, "utf8");
  return { count: arr.length, files: txtFiles.length };
}

function main() {
  syncRepo();
  const result = buildLexicon();
  console.log(`[sensitive-lexicon] files=${result.files} words=${result.count}`);
  console.log(`[sensitive-lexicon] output=${OUT_FILE}`);
}

main();

