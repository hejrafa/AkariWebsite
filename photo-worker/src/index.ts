import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";
import {
  ANSWER_SCHEMA,
  COMPOSE_ROLES,
  COMPOSE_SCHEMA,
  MEAL_SCHEMA,
  PROMPT_VERSION,
  ROLES,
  composeContextText,
  composeRulesText,
  composeUserText,
  mealSystemText,
  mealUserText,
  sanitiseHint,
  systemText,
  userText,
} from "./prompt.ts";
import type { ComposeTemplate, DrinkEntry, Language, MealCandidate, MealFood, VocabularyEntry } from "./prompt.ts";
import vocabulary from "./vocabulary.json" with { type: "json" };

// POST /photo: one meal photo in, three short fields out. POST /meal: the meal line,
// the phone's catalogue candidates and optionally the same photo in, Haiku's picks
// out. POST /compose: the meal line, optionally the photo and a few catalogue
// dishes in, the meal built from Akari's verified foods out. A meal or a compose
// counts against the same daily allowance as a photo, once, with or without its
// photo. Nothing is stored; the daily counters in the COUNTERS D1
// database are the only state, and the cron deletes them once they are two days old.
// The device and address counters are keyed by a hash with a salt that lives for
// one UTC day, so D1 never holds an IP address or a device id, and once the day's
// salt is deleted the keys can't be linked to anyone or to each other. Beside them,
// usage_days counts each day's calls to Anthropic per endpoint, their failures and
// their tokens, for the admin dashboard's cost; the cron keeps those 400 days.

export interface Env {
  COUNTERS: D1Database;
  ANTHROPIC_API_KEY?: string;
  DEVICE_DAILY_CAP?: string;
  ADDRESS_DAILY_CAP?: string;
  GLOBAL_DAILY_CAP?: string;
  // The scoreboard Mac's device id, a secret. Its calls skip the device and address
  // caps so the App's readings script can run a few hundred meals in one day.
  SCOREBOARD_DEVICE?: string;
}

const MODEL = "claude-haiku-5-5";
const MAX_BYTES = 600 * 1024;
const MAX_MEAL_BYTES = 32 * 1024;
// The photo rides in the meal body as base64, on top of the 32 KB for the rest.
const MAX_PHOTO_BASE64 = Math.ceil(MAX_BYTES / 3) * 4;
const MAX_FOODS = 12;
const MAX_CANDIDATES = 8;
const KINDS = new Set(["dish", "ingredient", "branded", "drink"]);
const MAX_TEMPLATES = 5;
const MAX_COMPOSED = 12;
const MAX_INGREDIENTS = 15;
const MIN_GRAMS = 1;
const MAX_GRAMS = 2000;
const VOCABULARY: VocabularyEntry[] = vocabulary.entries;
// Whole drinks are optional: the file has them once the app publishes some.
const DRINKS: DrinkEntry[] = (vocabulary as { drinks?: DrinkEntry[] }).drinks ?? [];
// A portion for a food whose grams the answer left out, and a drink's own serving.
const FALLBACK_GRAMS = 100;
const DRINK_SERVINGS = new Map(DRINKS.filter((d) => d.servingMilliliters).map((d) => [d.id, d.servingMilliliters as number]));
const VERIFIED = new Set([...VOCABULARY, ...DRINKS].map((entry) => entry.id));
// Built once per isolate: the rules and the whole vocabulary, the cached prefix.
const COMPOSE_RULES = composeRulesText(VOCABULARY, DRINKS);

// A name folded for comparison: lower-case ASCII words of three letters or more,
// without the words that say how a food is prepared or join two names.
const STOP_WORDS = new Set(["raw", "cooked", "boiled", "fried", "fresh", "whole", "plain", "type", "regular", "nfs", "the", "and", "with", "of", "mit", "und"]);
function nameWords(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

// Two word lists name the same food when they share a word, when a word of five
// letters or more starts the other (leeks and leek, Sojabohnen and Sojabohne), or
// when a word of four letters or more ends the other, as German compounds do
// (Sahne in Schlagsahne, Brot in Weizenbrot, Mehl in Weizenmehl).
function namesAgree(a: string[], b: string[]): boolean {
  const prefix = (short: string, long: string) => short.length >= 5 && long.startsWith(short);
  const suffix = (short: string, long: string) => short.length >= 4 && long.length > short.length && long.endsWith(short);
  // Plurals and inflections share a stem: blueberries and blueberry, Tomaten and Tomate.
  const stem = (x: string, y: string) => x.length >= 6 && y.length >= 6 && x.slice(0, 6) === y.slice(0, 6);
  return a.some((x) => b.some((y) => x === y || prefix(x, y) || prefix(y, x) || suffix(x, y) || suffix(y, x) || stem(x, y)));
}

// Each verified food's and whole drink's words, and whether it has a German name
// to check a German answer against: displayNameDE, or an alias that shares no word
// with the English names (Mandeln on Almond, not green bell pepper on Pepper, green).
const ROW_NAMES = new Map<string, { words: string[]; german: boolean }>();
for (const row of [...VOCABULARY, ...DRINKS]) {
  const english = "name" in row ? [row.name] : [row.ingredient, row.displayName ?? ""];
  const englishWords = english.flatMap(nameWords);
  const aliases = row.searchAliases ?? [];
  const german = Boolean(row.displayNameDE) || aliases.some((alias) => !namesAgree(nameWords(alias), englishWords));
  ROW_NAMES.set(row.id, { words: [...englishWords, ...[row.displayNameDE ?? "", ...aliases].flatMap(nameWords)], german });
}

// The name each verified food and whole drink is shown by, in each language: the
// English name the vocabulary prints, and displayNameDE in German when the row has
// one. Beside each, the words only that language's name has (Vollmilch in Flat White
// mit Vollmilch, not Flat or White), which tell a name in that language apart.
const ROW_DISPLAY = new Map<string, { name: Record<Language, string>; own: Record<Language, string[]> }>();
for (const row of [...VOCABULARY, ...DRINKS]) {
  const english = "name" in row ? row.name : row.displayName ?? row.ingredient;
  const german = row.displayNameDE || english;
  const [en, de] = [nameWords(english), nameWords(german)];
  ROW_DISPLAY.set(row.id, {
    name: { en: english, de: german },
    own: { en: en.filter((word) => !de.includes(word)), de: de.filter((word) => !en.includes(word)) },
  });
}

// The second look at a name the answer left without an id. Names are folded as
// nameWords folds them, but every word and number stays ("sour cream 24 %" is not
// sour cream), and match only whole: a name or alias equal to the folded name, or
// equal to it once one plural ending is gone from either side. Never a prefix, a
// suffix or anything fuzzier. German "-er" is not an ending here: with the umlaut
// folded away, Kräuter would become Kraut.
const FILLERS = new Set(["mixed", "fresh", "plain", "some", "a", "an", "ein", "eine", "etwas", "frische", "frischer"]);
const PLURALS: [ending: string, stem: string][] = [["ies", "y"], ["es", ""], ["s", ""], ["en", ""], ["n", ""], ["e", ""]];
function lookupWords(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
function singulars(name: string): string[] {
  return PLURALS.filter(([ending]) => name.length >= ending.length + 2 && name.endsWith(ending)).map(([ending, stem]) => name.slice(0, -ending.length) + stem);
}

// Each folded name and alias of the verified foods and whole drinks, and each of them
// without a plural ending, with the rows that carry it.
const ROWS_BY_NAME = new Map<string, Set<string>>();
const ROWS_BY_SINGULAR = new Map<string, Set<string>>();
const addRow = (index: Map<string, Set<string>>, key: string, id: string) => index.set(key, (index.get(key) ?? new Set()).add(id));
for (const row of [...VOCABULARY, ...DRINKS]) {
  const english = "name" in row ? [row.name] : [row.ingredient, row.displayName ?? ""];
  for (const name of [...english, row.displayNameDE ?? "", ...(row.searchAliases ?? [])]) {
    const folded = lookupWords(name).join(" ");
    if (!folded) continue;
    addRow(ROWS_BY_NAME, folded, row.id);
    for (const singular of singulars(folded)) addRow(ROWS_BY_SINGULAR, singular, row.id);
  }
}

// The rows a name is the name of. The name is tried whole and without its leading
// fillers, so "mixed olives" finds Olives and a row whose own alias starts with a
// filler ("plain bread roll") still finds itself.
function rowsNamed(name: string): Set<string> {
  const words = lookupWords(name);
  let first = 0;
  while (first < words.length && FILLERS.has(words[first])) first++;
  const rows = new Set<string>();
  for (const folded of new Set([words.join(" "), words.slice(first).join(" ")])) {
    if (!folded) continue;
    for (const key of [folded, ...singulars(folded)]) ROWS_BY_NAME.get(key)?.forEach((id) => rows.add(id));
    ROWS_BY_SINGULAR.get(folded)?.forEach((id) => rows.add(id));
  }
  return rows;
}

// The one row a name is the name of, or null when none or several are.
function lookUp(name: string): string | null {
  const rows = rowsNamed(name);
  return rows.size === 1 ? [...rows][0] : null;
}

const BUDGET_MS = 20_000;
const RETRY_DELAY_MS = 1_000;
const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MediaType = "image/jpeg" | "image/png";

interface Answer {
  food: boolean;
  main: string;
  meal: string;
}

interface MealRequest {
  text: string;
  foods: MealFood[];
}

interface MealPhoto {
  data: string;
  mediaType: MediaType;
}

interface Grams {
  estimate: number;
  low: number;
  high: number;
}

interface MealAnswerFood {
  query: string;
  pick: string | null;
  amount: number | null;
  unit: string | null;
  role: (typeof ROLES)[number];
  partOf?: string;
  confidence: number;
  grams: Grams | null;
  assumed?: true;
}

interface MealAnswer {
  foods: MealAnswerFood[];
  merged: { foods: string[]; as: string }[];
}

interface ComposeRequest {
  text: string;
  language: Language | null;
  templates: ComposeTemplate[];
}

interface ComposedPart {
  name: string;
  reference: string | null;
  grams: number;
  missing?: true;
}

interface ComposedFood extends ComposedPart {
  role: (typeof COMPOSE_ROLES)[number];
  ingredients?: ComposedPart[];
}

interface ComposeAnswer {
  foods: ComposedFood[];
  missing: string[];
  confidence: number;
}

class UpstreamFailure extends Error {}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handle(request, env, ctx);
    } catch {
      return new Response(null, { status: 500, headers: baseHeaders() });
    }
  },

  // Daily at 03:00 UTC (wrangler.jsonc): only today's and yesterday's counter rows stay.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purge(env));
  },
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = request.method === "POST" && ["/photo", "/meal", "/compose"].includes(url.pathname) ? url.pathname : null;
  if (!endpoint) return json(404, { reason: "not_found" });
  // The app is not a browser; anything sending an Origin is.
  if (request.headers.has("origin")) return json(403, { reason: "origin" });

  const device = request.headers.get("x-akari-device")?.trim().toLowerCase() ?? "";
  if (!DEVICE_ID.test(device)) return json(400, { reason: "device" });

  if (endpoint === "/photo") return photo(request, env, ctx, device);
  return endpoint === "/meal" ? meal(request, env, ctx, device) : compose(request, env, ctx, device);
}

function isScoreboard(env: Env, device: string): boolean {
  const scoreboard = env.SCOREBOARD_DEVICE?.trim().toLowerCase();
  return !!scoreboard && scoreboard === device;
}

// Only the scoreboard's calls say so in the log; everyone else's lines are unchanged.
function scoreboardLog(env: Env, device: string): { scoreboard?: true } {
  return isScoreboard(env, device) ? { scoreboard: true } : {};
}

async function photo(request: Request, env: Env, ctx: ExecutionContext, device: string): Promise<Response> {
  const declared = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (declared !== "image/jpeg" && declared !== "image/png") return json(415, { reason: "type" });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return json(413, { reason: "size" });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return json(413, { reason: "size" });
  const mediaType = sniff(bytes);
  if (!mediaType) return json(415, { reason: "type" });

  if (!env.ANTHROPIC_API_KEY) return json(503, { reason: "unconfigured" });
  const refused = await spend(request, env, device);
  if (refused) return refused;

  const language = languageOf(request);
  const hint = sanitiseHint(request.headers.get("x-akari-hint"));
  const build = buildOf(request);

  const started = Date.now();
  let message: Anthropic.Message | undefined;
  try {
    message = await ask(env.ANTHROPIC_API_KEY, {
      model: MODEL,
      max_tokens: 400,
      thinking: { type: "disabled" },
      system: systemText(language),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64(bytes) } },
            { type: "text", text: userText(language, hint) },
          ],
        },
      ],
      output_config: { format: { type: "json_schema", schema: ANSWER_SCHEMA } },
    });
    const answer = readAnswer(message);
    // Counts only: never the photo, the answer or the device id.
    console.log(JSON.stringify({ photo: "ok", ms: Date.now() - started, prompt: PROMPT_VERSION, build, ...scoreboardLog(env, device), ...usage(message) }));
    countUsage(env, ctx, "photo", message, false);
    return json(200, answer);
  } catch (error) {
    console.log(JSON.stringify({ photo: "upstream", ms: Date.now() - started, ...scoreboardLog(env, device), status: error instanceof APIError ? error.status ?? "network" : "answer" }));
    countUsage(env, ctx, "photo", message, true);
    return json(503, { reason: "upstream" });
  }
}

// The JSON body /meal and /compose share: at most 32 KB plus an optional base64
// photo, checked before anything is counted. A Response is the refusal.
async function readMealBody(request: Request): Promise<{ body: unknown; photo: MealPhoto | null } | Response> {
  const declared = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (declared !== "application/json") return json(415, { reason: "type" });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_MEAL_BYTES + MAX_PHOTO_BASE64) return json(413, { reason: "size" });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_MEAL_BYTES + MAX_PHOTO_BASE64) return json(413, { reason: "size" });
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return json(400, { reason: "malformed" });
  }
  const photoField = isRecord(body) ? body.photo : undefined;
  const photoChars = typeof photoField === "string" ? photoField.length : 0;
  if (bytes.byteLength - photoChars > MAX_MEAL_BYTES) return json(413, { reason: "size" });
  const photo = readMealPhoto(photoField);
  if (photo === "size" || photo === "type") return json(photo === "size" ? 413 : 415, { reason: photo });
  if (photo === "malformed") return json(400, { reason: "malformed" });
  return { body, photo };
}

async function meal(request: Request, env: Env, ctx: ExecutionContext, device: string): Promise<Response> {
  const read = await readMealBody(request);
  if (read instanceof Response) return read;
  const { body, photo } = read;
  const input = readMealRequest(body);
  if (!input) return json(400, { reason: "malformed" });

  if (!env.ANTHROPIC_API_KEY) return json(503, { reason: "unconfigured" });
  const refused = await spend(request, env, device);
  if (refused) return refused;

  const language = languageOf(request);
  const build = buildOf(request);

  const started = Date.now();
  let message: Anthropic.Message | undefined;
  try {
    message = await ask(env.ANTHROPIC_API_KEY, {
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "disabled" },
      system: mealSystemText(language, photo !== null),
      messages: [
        {
          role: "user",
          content: [
            ...(photo ? [{ type: "image" as const, source: { type: "base64" as const, media_type: photo.mediaType, data: photo.data } }] : []),
            { type: "text", text: mealUserText(input.text, input.foods) },
          ],
        },
      ],
      output_config: { format: { type: "json_schema", schema: MEAL_SCHEMA } },
    });
    const { answer, dropped } = readMeal(message, input);
    // Counts only: never the meal text, the names or the device id.
    const picked = answer.foods.filter((food) => food.pick).length;
    const confidence = answer.foods.length
      ? Math.round((answer.foods.reduce((sum, food) => sum + food.confidence, 0) / answer.foods.length) * 10) / 10
      : null;
    console.log(
      JSON.stringify({
        meal: "ok",
        ms: Date.now() - started,
        prompt: PROMPT_VERSION,
        build,
        asked: input.foods.length,
        foods: answer.foods.length,
        picked,
        merged: answer.merged.length,
        dropped,
        photo: photo !== null,
        confidence,
        ...scoreboardLog(env, device),
        ...usage(message),
      }),
    );
    countUsage(env, ctx, "meal", message, false);
    return json(200, answer);
  } catch (error) {
    console.log(JSON.stringify({ meal: "upstream", ms: Date.now() - started, ...scoreboardLog(env, device), status: error instanceof APIError ? error.status ?? "network" : "answer" }));
    countUsage(env, ctx, "meal", message, true);
    return json(503, { reason: "upstream" });
  }
}

async function compose(request: Request, env: Env, ctx: ExecutionContext, device: string): Promise<Response> {
  const read = await readMealBody(request);
  if (read instanceof Response) return read;
  const { body, photo } = read;
  const input = readComposeRequest(body);
  if (!input) return json(400, { reason: "malformed" });

  if (!env.ANTHROPIC_API_KEY) return json(503, { reason: "unconfigured" });
  const refused = await spend(request, env, device);
  if (refused) return refused;

  const language = input.language ?? languageOf(request);
  const build = buildOf(request);

  const started = Date.now();
  let message: Anthropic.Message | undefined;
  try {
    message = await ask(env.ANTHROPIC_API_KEY, {
      model: MODEL,
      max_tokens: 3000,
      thinking: { type: "disabled" },
      // The rules and the vocabulary are the same bytes for every request, so they
      // are paid once per cache window; the language and photo lines come after.
      system: [
        { type: "text", text: COMPOSE_RULES, cache_control: { type: "ephemeral" } },
        { type: "text", text: composeContextText(language, photo !== null) },
      ],
      messages: [
        {
          role: "user",
          content: [
            ...(photo ? [{ type: "image" as const, source: { type: "base64" as const, media_type: photo.mediaType, data: photo.data } }] : []),
            { type: "text", text: composeUserText(input.text, input.templates, language) },
          ],
        },
      ],
      output_config: { format: { type: "json_schema", schema: COMPOSE_SCHEMA } },
    });
    const { answer, dropped, resolved, renamed } = readCompose(message, input, language);
    // Counts only: never the meal text, the names, the ids or the device id.
    console.log(
      JSON.stringify({
        compose: "ok",
        ms: Date.now() - started,
        prompt: PROMPT_VERSION,
        build,
        templates: input.templates.length,
        foods: answer.foods.length,
        ingredients: answer.foods.reduce((sum, food) => sum + (food.ingredients?.length ?? 0), 0),
        missing: answer.missing.length,
        dropped,
        resolved,
        renamed,
        photo: photo !== null,
        confidence: Math.round(answer.confidence * 10) / 10,
        ...scoreboardLog(env, device),
        ...usage(message),
        cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: message.usage.cache_creation_input_tokens ?? 0,
      }),
    );
    countUsage(env, ctx, "compose", message, false);
    return json(200, answer);
  } catch (error) {
    console.log(JSON.stringify({ compose: "upstream", ms: Date.now() - started, ...scoreboardLog(env, device), status: error instanceof APIError ? error.status ?? "network" : "answer" }));
    countUsage(env, ctx, "compose", message, true);
    return json(503, { reason: "upstream" });
  }
}

// Checks the device, address and global allowance and spends one from each, or
// answers the 429 that says which ran out. The scoreboard device spends only the
// global allowance. The read and the spend go to D1 as one batch, which runs as one
// transaction, and the spend writes nothing while any of the counters is at its cap,
// so a refused call costs no write and doesn't use up the address or global
// allowance for anyone else.
async function spend(request: Request, env: Env, device: string): Promise<Response | null> {
  const day = new Date().toISOString().slice(0, 10);
  const global = { key: `global:${day}`, cap: cap(env.GLOBAL_DAILY_CAP, 6000), reason: "global" };
  let counters = [global];
  if (!isScoreboard(env, device)) {
    const address = request.headers.get("cf-connecting-ip") ?? "unknown";
    const salt = await dailySalt(env, day);
    counters = [
      { key: `device:${await hashed(salt, "device", device)}:${day}`, cap: cap(env.DEVICE_DAILY_CAP, 80), reason: "device" },
      { key: `address:${await hashed(salt, "address", address)}:${day}`, cap: cap(env.ADDRESS_DAILY_CAP, 240), reason: "device" },
      global,
    ];
  }
  // Count the attempt before asking, so failed calls still spend the day's allowance.
  const [read] = await env.COUNTERS.batch<{ key: string; count: number }>([
    env.COUNTERS.prepare(`SELECT key, count FROM counters WHERE key IN (${counters.map(() => "?").join(", ")})`).bind(
      ...counters.map((c) => c.key),
    ),
    env.COUNTERS.prepare(
      `WITH spend (key, cap) AS (VALUES ${counters.map(() => "(?, ?)").join(", ")})
       INSERT INTO counters (key, day, count)
       SELECT key, ?, 1 FROM spend
       WHERE NOT EXISTS (SELECT 1 FROM spend LEFT JOIN counters USING (key) WHERE coalesce(count, 0) >= cap)
       ON CONFLICT (key) DO UPDATE SET count = count + 1`,
    ).bind(...counters.flatMap((c) => [c.key, c.cap]), day),
  ]);
  const counts = new Map(read.results.map((row) => [row.key, row.count]));
  const hit = counters.find((c) => (counts.get(c.key) ?? 0) >= c.cap);
  return hit ? json(429, { reason: hit.reason }) : null;
}

// One call to Anthropic added to today's row for its endpoint: one request, a
// failure when Anthropic or its answer failed, and the tokens the response used
// (none when there was no response). It writes after the answer is on its way.
function countUsage(env: Env, ctx: ExecutionContext, endpoint: "photo" | "meal" | "compose", message: Anthropic.Message | undefined, failed: boolean): void {
  const day = new Date().toISOString().slice(0, 10);
  const tokens = message?.usage;
  const write = env.COUNTERS.prepare(
    `INSERT INTO usage_days (day, endpoint, requests, failures, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens)
     VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT (day, endpoint) DO UPDATE SET
       requests = requests + 1,
       failures = failures + ?3,
       input_tokens = input_tokens + ?4,
       output_tokens = output_tokens + ?5,
       cache_read_tokens = cache_read_tokens + ?6,
       cache_write_tokens = cache_write_tokens + ?7`,
  ).bind(
    day,
    endpoint,
    failed ? 1 : 0,
    tokens?.input_tokens ?? 0,
    tokens?.output_tokens ?? 0,
    tokens?.cache_read_input_tokens ?? 0,
    tokens?.cache_creation_input_tokens ?? 0,
  );
  ctx.waitUntil(write.run().then(() => undefined, () => console.log(JSON.stringify({ usage: "unrecorded", endpoint }))));
}

// Counter and salt rows from before yesterday. Yesterday's stay so a call that
// started just before midnight still finds its rows. Usage rows stay 400 days.
async function purge(env: Env): Promise<void> {
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const usageKept = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  await env.COUNTERS.batch([
    env.COUNTERS.prepare("DELETE FROM counters WHERE day < ?").bind(yesterday),
    env.COUNTERS.prepare("DELETE FROM salts WHERE day < ?").bind(yesterday),
    env.COUNTERS.prepare("DELETE FROM usage_days WHERE day < ?").bind(usageKept),
  ]);
}

function languageOf(request: Request): Language {
  return request.headers.get("x-akari-language")?.trim().toLowerCase().startsWith("de") ? "de" : "en";
}

function buildOf(request: Request): string | undefined {
  return request.headers.get("x-akari-build")?.replace(/[^0-9.]/g, "").slice(0, 16) || undefined;
}

function usage(message: Anthropic.Message) {
  return { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens };
}

async function ask(apiKey: string, params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> {
  const client = new Anthropic({ apiKey, maxRetries: 0, fetch: (input, init) => fetch(input, init) });
  const deadline = Date.now() + BUDGET_MS;
  for (let attempt = 0; ; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new UpstreamFailure("budget");
    try {
      return await client.messages.create(params, { timeout: remaining });
    } catch (error) {
      if (attempt > 0 || !retryable(error) || deadline - Date.now() <= RETRY_DELAY_MS) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

function retryable(error: unknown): boolean {
  if (error instanceof APIConnectionTimeoutError) return false;
  if (error instanceof APIConnectionError) return true;
  return error instanceof APIError && error.status !== undefined && (error.status === 429 || error.status >= 500);
}

function readJson(message: Anthropic.Message): Record<string, unknown> {
  if (message.stop_reason !== "end_turn") throw new UpstreamFailure(message.stop_reason ?? "unknown");
  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new UpstreamFailure("no text");
  const parsed: unknown = JSON.parse(text.text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new UpstreamFailure("shape");
  return parsed as Record<string, unknown>;
}

function readAnswer(message: Anthropic.Message): Answer {
  const { food, main, meal } = readJson(message);
  if (typeof food !== "boolean" || typeof main !== "string" || typeof meal !== "string") throw new UpstreamFailure("shape");
  if (!food) return { food: false, main: "", meal: "" };
  return { food: true, main: main.trim().slice(0, 120), meal: meal.trim().slice(0, 400) };
}

// The optional photo: null when there is none, else base64 JPEG or PNG bytes of at
// most 600 KB, checked by size and by its first bytes without decoding it whole.
function readMealPhoto(value: unknown): MealPhoto | null | "size" | "type" | "malformed" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length === 0) return "malformed";
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return "malformed";
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  if ((value.length / 4) * 3 - padding > MAX_BYTES) return "size";
  const head = Uint8Array.from(atob(value.slice(0, 16)), (char) => char.charCodeAt(0));
  const mediaType = sniff(head);
  if (!mediaType) return "type";
  return { data: value, mediaType };
}

// The request as the phone must send it, or null for a 400. Strings are bounded so
// one food can't carry the whole 32 KB into the prompt.
function readMealRequest(body: unknown): MealRequest | null {
  if (!isRecord(body)) return null;
  const text = boundedString(body.text, 2000);
  if (!text || !Array.isArray(body.foods) || body.foods.length === 0 || body.foods.length > MAX_FOODS) return null;
  const foods: MealFood[] = [];
  for (const raw of body.foods) {
    if (!isRecord(raw)) return null;
    const query = boundedString(raw.query, 120);
    if (!query || foods.some((food) => food.query === query)) return null;
    const amount = raw.amount === null || raw.amount === undefined ? null : boundedString(raw.amount, 60);
    if (amount === undefined) return null;
    if (!Array.isArray(raw.candidates) || raw.candidates.length > MAX_CANDIDATES) return null;
    const candidates: MealCandidate[] = [];
    for (const c of raw.candidates) {
      if (!isRecord(c)) return null;
      const id = boundedString(c.id, 200);
      const name = boundedString(c.name, 200);
      const serving = c.serving === null || c.serving === undefined ? null : boundedString(c.serving, 120);
      if (!id || !name || serving === undefined || typeof c.kind !== "string" || !KINDS.has(c.kind) || typeof c.verified !== "boolean") return null;
      candidates.push({ id, name, kind: c.kind as MealCandidate["kind"], verified: c.verified, serving });
    }
    foods.push({ query, amount: amount || null, candidates });
  }
  return { text, foods };
}

// Haiku's answer, held to the request: picks only from the candidates the phone
// sent, merges only of queries the phone sent, partOf only another answered food.
// Anything else is dropped or set to null, and counted for the log.
function readMeal(message: Anthropic.Message, input: MealRequest): { answer: MealAnswer; dropped: number } {
  const parsed = readJson(message);
  if (!Array.isArray(parsed.foods) || !Array.isArray(parsed.merged)) throw new UpstreamFailure("shape");
  let dropped = 0;

  const candidates = new Map(input.foods.map((food) => [food.query, new Set(food.candidates.map((c) => c.id))]));
  const pieces = new Set<string>();
  const merged: MealAnswer["merged"] = [];
  for (const raw of parsed.merged) {
    const as = isRecord(raw) ? boundedString(raw.as, 120) : undefined;
    const names = isRecord(raw) && Array.isArray(raw.foods) ? [...new Set(raw.foods)] : [];
    const valid = as && !candidates.has(as) && names.length >= 2 && names.every((name) => typeof name === "string" && candidates.has(name) && !pieces.has(name));
    if (!valid) {
      dropped++;
      continue;
    }
    const joined = names as string[];
    joined.forEach((name) => pieces.add(name));
    candidates.set(as, new Set(joined.flatMap((name) => [...candidates.get(name)!])));
    merged.push({ foods: joined, as });
  }

  const foods: MealAnswerFood[] = [];
  const partOf = new Map<MealAnswerFood, unknown>();
  for (const raw of parsed.foods) {
    const query = isRecord(raw) && typeof raw.query === "string" ? raw.query : "";
    if (!isRecord(raw) || !candidates.has(query) || pieces.has(query) || foods.some((food) => food.query === query)) {
      dropped++;
      continue;
    }
    let pick = typeof raw.pick === "string" ? raw.pick : null;
    if (pick !== null && !candidates.get(query)!.has(pick)) {
      pick = null;
      dropped++;
    }
    const amount = typeof raw.amount === "number" && Number.isFinite(raw.amount) && raw.amount > 0 ? raw.amount : null;
    const unit = amount === null ? null : boundedString(raw.unit, 24) || null;
    const role = ROLES.find((r) => r === raw.role) ?? "side";
    // The schema can't bound numbers, so a confidence outside 0 to 1 or a range that
    // doesn't hold its estimate falls back here instead of failing the meal.
    let confidence = 0.5;
    if (typeof raw.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1) confidence = Math.round(raw.confidence * 100) / 100;
    else dropped++;
    const grams = readGrams(raw.grams);
    if (grams === undefined) dropped++;
    const food: MealAnswerFood = { query, pick, amount, unit, role, confidence, grams: grams ?? null };
    if (raw.assumed === true) food.assumed = true;
    foods.push(food);
    partOf.set(food, raw.partOf);
  }
  for (const food of foods) {
    const parent = partOf.get(food);
    if (typeof parent !== "string") continue;
    if (parent !== food.query && foods.some((other) => other.query === parent)) food.partOf = parent;
    else dropped++;
  }
  return { answer: { foods, merged }, dropped };
}

// The compose request as the phone must send it, or null for a 400. Templates are
// optional; each has its id, name, serving and the ingredient ids with grams.
function readComposeRequest(body: unknown): ComposeRequest | null {
  if (!isRecord(body)) return null;
  const text = boundedString(body.text, 2000);
  if (!text) return null;
  let language: Language | null = null;
  if (body.language !== undefined && body.language !== null) {
    if (typeof body.language !== "string") return null;
    language = body.language.trim().toLowerCase().startsWith("de") ? "de" : "en";
  }
  const rawTemplates = body.templates ?? [];
  if (!Array.isArray(rawTemplates) || rawTemplates.length > MAX_TEMPLATES) return null;
  const templates: ComposeTemplate[] = [];
  for (const raw of rawTemplates) {
    if (!isRecord(raw)) return null;
    const id = boundedString(raw.id, 200);
    const name = boundedString(raw.name, 200);
    const serving = raw.serving === null || raw.serving === undefined ? null : boundedString(raw.serving, 120);
    if (!id || !name || serving === undefined || templates.some((t) => t.id === id)) return null;
    if (!Array.isArray(raw.ingredients) || raw.ingredients.length > MAX_INGREDIENTS) return null;
    const ingredients: ComposeTemplate["ingredients"] = [];
    for (const part of raw.ingredients) {
      if (!isRecord(part)) return null;
      const reference = boundedString(part.reference, 200);
      const grams = part.grams;
      if (!reference || typeof grams !== "number" || !Number.isFinite(grams) || grams <= 0 || grams > MAX_GRAMS * 10) return null;
      ingredients.push({ reference, grams });
    }
    templates.push({ id, name, serving: serving || null, ingredients });
  }
  return { text, language, templates };
}

// Haiku's meal, held to the vocabulary and the sent templates: a food may name a
// verified food, a whole drink or a template, an ingredient a verified food or a
// template's ingredient; anything else becomes null and missing. Grams are clamped
// to 1 to 2000, and the missing list is rebuilt from what is flagged, never with a
// composed dish's own name. A verified food's or a whole drink's reference stands
// only when the answer's name agrees with that row's names, so a neighbouring id
// copied by mistake (Leek on fennel seed) becomes missing too; a German name is not
// checked against a row with no German name. Before the missing list is built, a
// food or part left without an id has a second look: when its name is exactly one
// row's name or alias it takes that row's id. Then a food or part that stands on a
// verified food or a whole drink takes that row's name in the request's language
// when its own name is in the other language, agreeing with words only the row's
// other-language name has, so a German phone never sees Haiku's English "Tahini" for
// the row called Tahin; or when it is free wording, none of the row's names. A name
// the row knows that is not in the other language, such as edamame, roti or Flat
// white, is kept as given. A sent template used whole and a template's ingredient
// keep the names they came with, and a composed dish keeps Haiku's name, as it has
// no row. Dropped and
// corrected fields, the names the second look found and the names replaced by a
// row's are counted for the log.
function readCompose(message: Anthropic.Message, input: ComposeRequest, language: Language): { answer: ComposeAnswer; dropped: number; resolved: number; renamed: number } {
  const parsed = readJson(message);
  if (!Array.isArray(parsed.foods)) throw new UpstreamFailure("shape");
  let dropped = 0;

  const templateIds = new Set(input.templates.map((t) => t.id));
  const templateParts = new Set(input.templates.flatMap((t) => t.ingredients.map((part) => part.reference)));
  const foodReference = (id: string) => VERIFIED.has(id) || templateIds.has(id);
  const partReference = (id: string) => VERIFIED.has(id) || templateParts.has(id);
  // A sent template and its ingredients carry no names to compare with.
  const namedWrongly = (name: string, id: string) => {
    const row = ROW_NAMES.get(id);
    if (!row || templateIds.has(id) || templateParts.has(id)) return false;
    if (language === "de" && !row.german) return false;
    // A name of only short words ("Ei", "Öl") has nothing to compare; the id stands.
    const words = nameWords(name);
    return words.length > 0 && !namesAgree(words, row.words);
  };

  const part = (raw: unknown, known: (id: string) => boolean): ComposedPart | null => {
    const name = isRecord(raw) ? boundedString(raw.name, 120) : undefined;
    if (!isRecord(raw) || !name) {
      dropped++;
      return null;
    }
    let reference = typeof raw.reference === "string" ? raw.reference.trim() : null;
    if (reference !== null && (!known(reference) || namedWrongly(name, reference))) {
      reference = null;
      dropped++;
    }
    // Grams Haiku left out, or gave as nothing, fall back to a plain portion
    // instead of 1 g: a whole drink's serving, else 100 g. A stated amount is
    // clamped to 1 to 2000.
    const given = typeof raw.grams === "number" && Number.isFinite(raw.grams) && raw.grams > 0;
    const fallback = (reference && DRINK_SERVINGS.get(reference)) || FALLBACK_GRAMS;
    const stated = given ? (raw.grams as number) : fallback;
    const grams = Math.round(Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, stated)) * 10) / 10;
    if (!given || stated > MAX_GRAMS) dropped++;
    const out: ComposedPart = { name, reference, grams };
    if (reference === null) out.missing = true;
    return out;
  };

  const foods: ComposedFood[] = [];
  for (const raw of parsed.foods) {
    if (foods.length === MAX_COMPOSED) {
      dropped++;
      continue;
    }
    const role = isRecord(raw) ? COMPOSE_ROLES.find((r) => r === raw.role) : undefined;
    const rawParts = isRecord(raw) && Array.isArray(raw.ingredients) ? raw.ingredients : [];
    // Only a dish has parts; a side or a drink stands alone.
    const ingredients: ComposedPart[] = [];
    if (role === "dish") {
      for (const rawPart of rawParts) {
        if (ingredients.length === MAX_INGREDIENTS) {
          dropped++;
          continue;
        }
        const composed = part(rawPart, partReference);
        if (composed) ingredients.push(composed);
      }
    } else if (rawParts.length) dropped++;
    // A dish with parts is composed here, so its own reference is null and its parts
    // say what is missing; a template used whole carries no parts.
    const food = part(ingredients.length && isRecord(raw) ? { ...raw, reference: null } : raw, foodReference);
    if (!food) continue;
    if (!role) dropped++;
    const composed: ComposedFood = { name: food.name, role: role ?? "side", reference: food.reference, grams: food.grams };
    if (ingredients.length) composed.ingredients = ingredients;
    else if (food.missing) composed.missing = true;
    foods.push(composed);
  }

  // A composed dish carries no missing flag, so only a food or a part is looked up.
  let resolved = 0;
  for (const item of foods.flatMap((food) => [food, ...(food.ingredients ?? [])])) {
    const reference = item.missing ? lookUp(item.name) : null;
    if (!reference) continue;
    item.reference = reference;
    delete item.missing;
    resolved++;
  }

  // The row's own name in the request's language, for a food or part on a row whose
  // name is in the other language or is none of the row's names.
  let renamed = 0;
  const other: Language = language === "de" ? "en" : "de";
  const rename = (item: ComposedPart, sent: Set<string>) => {
    const row = item.reference && !sent.has(item.reference) ? ROW_DISPLAY.get(item.reference) : undefined;
    if (!row || item.name === row.name[language]) return;
    const otherLanguage = namesAgree(nameWords(item.name), row.own[other]);
    if (!otherLanguage && rowsNamed(item.name).has(item.reference!)) return;
    item.name = row.name[language];
    renamed++;
  };
  for (const food of foods) {
    rename(food, templateIds);
    for (const ingredient of food.ingredients ?? []) rename(ingredient, templateParts);
  }

  // A composed dish is there, not missing, even when a part or another food repeats its name.
  const dishes = new Set(foods.filter((food) => food.ingredients).map((food) => food.name.toLowerCase()));
  const missing: string[] = [];
  for (const food of foods) {
    for (const item of [food, ...(food.ingredients ?? [])]) {
      if (item.missing && !missing.includes(item.name) && !dishes.has(item.name.toLowerCase())) missing.push(item.name);
    }
  }
  let confidence = 0.5;
  if (typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1) confidence = Math.round(parsed.confidence * 100) / 100;
  else dropped++;
  return { answer: { foods, missing, confidence }, dropped, resolved, renamed };
}

// A gram range with low <= estimate <= high, all positive, or null when the model
// said it can't state one, or undefined when what it said doesn't hold.
function readGrams(value: unknown): Grams | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const { estimate, low, high } = value;
  const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
  if (!positive(estimate) || !positive(low) || !positive(high) || low > estimate || estimate > high) return undefined;
  // A tenth of a gram keeps small amounts such as chives above zero and the order intact.
  const tenth = (n: number) => Math.round(n * 10) / 10;
  return { estimate: tenth(estimate), low: tenth(low), high: tenth(high) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A trimmed string of at most max characters, "" for an empty one, undefined for
// anything else. Control characters become spaces.
function boundedString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string" || value.length > max) return undefined;
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
}

function sniff(bytes: Uint8Array): MediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((value, i) => bytes[i] === value)) return "image/png";
  return null;
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

let cachedSalt: { day: string; salt: string } | null = null;

// The day's salt, read once per isolate and day. When the day has none yet, two
// isolates racing on its first photo both try to insert one; the first insert wins
// and both read that one back.
async function dailySalt(env: Env, day: string): Promise<string> {
  if (cachedSalt?.day === day) return cachedSalt.salt;
  const read = env.COUNTERS.prepare("SELECT salt FROM salts WHERE day = ?").bind(day);
  let row = await read.first<{ salt: string }>();
  if (!row) {
    const fresh = hex(crypto.getRandomValues(new Uint8Array(16)));
    const [, after] = await env.COUNTERS.batch<{ salt: string }>([
      env.COUNTERS.prepare("INSERT INTO salts (day, salt) VALUES (?, ?) ON CONFLICT (day) DO NOTHING").bind(day, fresh),
      read,
    ]);
    row = after.results[0];
  }
  cachedSalt = { day, salt: row.salt };
  return row.salt;
}

async function hashed(salt: string, kind: string, value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}|${kind}|${value}`));
  return hex(new Uint8Array(digest)).slice(0, 16);
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cap(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function baseHeaders(): Headers {
  return new Headers({ "cache-control": "no-store", "x-akari-prompt": PROMPT_VERSION });
}

function json(status: number, body: unknown): Response {
  const headers = baseHeaders();
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}
