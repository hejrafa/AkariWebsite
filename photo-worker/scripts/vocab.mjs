// pnpm vocab: writes src/vocabulary.json from Akari's verified generic foods, as
// the public AkariFoodIndex repo publishes them on its main branch. Run it before
// every deploy; /compose may only answer with these ids or a sent template's.

import { writeFileSync } from "node:fs";

const REPO = "hejrafa/AkariFoodIndex";
const PATH = "verified-foods.json";
const ID = /^[a-z]+:[A-Za-z0-9._-]+$/;

const head = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
  headers: { accept: "application/vnd.github.sha", "user-agent": "akari-photo-vocab" },
});
if (!head.ok) throw new Error(`main's commit: HTTP ${head.status}`);
const commit = (await head.text()).trim();
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`main's commit: ${commit.slice(0, 60)}`);

// The file at that commit, so the entries and the commit written below agree.
const raw = await fetch(`https://raw.githubusercontent.com/${REPO}/${commit}/${PATH}`);
if (!raw.ok) throw new Error(`${PATH}: HTTP ${raw.status}`);
const source = await raw.json();
if (!Array.isArray(source?.references)) throw new Error(`${PATH}: no references list`);

const text = (value, max) => (typeof value === "string" && value.trim() && value.length <= max ? value.trim() : undefined);
const seen = new Set();
const entries = source.references.map((entry, i) => {
  const id = text(entry?.id, 80);
  const ingredient = text(entry?.ingredient, 120);
  if (!id || !ID.test(id) || !ingredient) throw new Error(`${PATH}: reference ${i} has no usable id or ingredient`);
  if (seen.has(id)) throw new Error(`${PATH}: ${id} is listed twice`);
  seen.add(id);
  const out = { id, ingredient };
  const displayName = text(entry.displayName, 120);
  const displayNameDE = text(entry.displayNameDE, 120);
  if (displayName) out.displayName = displayName;
  if (displayNameDE) out.displayNameDE = displayNameDE;
  const aliases = Array.isArray(entry.searchAliases) ? entry.searchAliases.map((alias) => text(alias, 120)).filter(Boolean) : [];
  if (aliases.length) out.searchAliases = aliases;
  return out;
});
if (entries.length < 100) throw new Error(`${PATH}: only ${entries.length} references`);

const file = new URL("../src/vocabulary.json", import.meta.url);
writeFileSync(file, `${JSON.stringify({ source: { repo: REPO, path: PATH, commit, policy: source.policy ?? null }, entries }, null, 1)}\n`);
console.log(`${entries.length} verified foods from ${REPO}@${commit.slice(0, 7)} → src/vocabulary.json`);
