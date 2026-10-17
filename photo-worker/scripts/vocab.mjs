// pnpm vocab: writes src/vocabulary.json from Akari's verified generic foods, as
// the public AkariFoodIndex repo publishes them on its main branch. Run it before
// every deploy; /compose may only answer with these ids or a sent template's. An
// optional drinks list, whole drinks such as a flat white with oat milk, is
// written beside them.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = "hejrafa/AkariFoodIndex";
const PATH = "verified-foods.json";
const ID = /^[a-z]+:[A-Za-z0-9._-]+$/;
// A drink's id may have more than one segment, such as cafe:generic:flat-white.
const DRINK_ID = /^[a-z]+(:[A-Za-z0-9._-]+)+$/;

// The vocabulary as src/vocabulary.json holds it, from main's commit of the file.
// fetch is a parameter so the tests can stand in for GitHub.
export async function fetchVocabulary(get = fetch) {
  const head = await get(`https://api.github.com/repos/${REPO}/commits/main`, {
    headers: { accept: "application/vnd.github.sha", "user-agent": "akari-photo-vocab" },
  });
  if (!head.ok) throw new Error(`main's commit: HTTP ${head.status}`);
  const commit = (await head.text()).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`main's commit: ${commit.slice(0, 60)}`);

  // The file at that commit, so the entries and the commit written below agree.
  const raw = await get(`https://raw.githubusercontent.com/${REPO}/${commit}/${PATH}`);
  if (!raw.ok) throw new Error(`${PATH}: HTTP ${raw.status}`);
  const source = await raw.json();
  if (!Array.isArray(source?.references)) throw new Error(`${PATH}: no references list`);

  const text = (value, max) => (typeof value === "string" && value.trim() && value.length <= max ? value.trim() : undefined);
  const aliasesOf = (entry) => (Array.isArray(entry.searchAliases) ? entry.searchAliases.map((alias) => text(alias, 120)).filter(Boolean) : []);
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
    const aliases = aliasesOf(entry);
    if (aliases.length) out.searchAliases = aliases;
    return out;
  });
  if (entries.length < 100) throw new Error(`${PATH}: only ${entries.length} references`);

  if (source.drinks !== undefined && !Array.isArray(source.drinks)) throw new Error(`${PATH}: drinks is not a list`);
  const drinks = (source.drinks ?? []).map((entry, i) => {
    const id = text(entry?.id, 80);
    const name = text(entry?.name, 120);
    if (!id || !DRINK_ID.test(id) || !name) throw new Error(`${PATH}: drink ${i} has no usable id or name`);
    if (seen.has(id)) throw new Error(`${PATH}: ${id} is listed twice`);
    seen.add(id);
    const out = { id, name };
    const displayNameDE = text(entry.displayNameDE, 120);
    if (displayNameDE) out.displayNameDE = displayNameDE;
    const aliases = aliasesOf(entry);
    if (aliases.length) out.searchAliases = aliases;
    const ml = entry.servingMilliliters;
    if (typeof ml === "number" && Number.isFinite(ml) && ml > 0 && ml <= 2000) out.servingMilliliters = ml;
    return out;
  });

  const vocabulary = { source: { repo: REPO, path: PATH, commit, policy: source.policy ?? null }, entries };
  if (drinks.length) vocabulary.drinks = drinks;
  return vocabulary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const vocabulary = await fetchVocabulary();
  const file = new URL("../src/vocabulary.json", import.meta.url);
  writeFileSync(file, `${JSON.stringify(vocabulary, null, 1)}\n`);
  const drinks = vocabulary.drinks?.length ?? 0;
  console.log(`${vocabulary.entries.length} verified foods and ${drinks} whole drinks from ${REPO}@${vocabulary.source.commit.slice(0, 7)} → src/vocabulary.json`);
}
