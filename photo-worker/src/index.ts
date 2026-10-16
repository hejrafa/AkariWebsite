import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";
import { ANSWER_SCHEMA, MEAL_SCHEMA, PROMPT_VERSION, ROLES, mealSystemText, mealUserText, sanitiseHint, systemText, userText } from "./prompt.ts";
import type { Language, MealCandidate, MealFood } from "./prompt.ts";

// POST /photo: one meal photo in, three short fields out. POST /meal: the meal line,
// the phone's catalogue candidates and optionally the same photo in, Haiku's picks
// out. A meal counts against the same daily allowance as a photo, once, with or
// without its photo. Nothing is stored; the daily counters in
// PHOTO_COUNTERS are the only state, and they expire after 48 h.
// The device and address counters are keyed by a hash with a salt that lives for
// one UTC day, so KV never holds an IP address or a device id, and once the day's
// salt expires the keys can't be linked to anyone or to each other.

export interface Env {
  PHOTO_COUNTERS: KVNamespace;
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
const BUDGET_MS = 20_000;
const RETRY_DELAY_MS = 1_000;
const COUNTER_TTL_SECONDS = 48 * 60 * 60;
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

class UpstreamFailure extends Error {}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handle(request, env, ctx);
    } catch {
      return new Response(null, { status: 500, headers: baseHeaders() });
    }
  },
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = request.method === "POST" && (url.pathname === "/photo" || url.pathname === "/meal") ? url.pathname : null;
  if (!endpoint) return json(404, { reason: "not_found" });
  // The app is not a browser; anything sending an Origin is.
  if (request.headers.has("origin")) return json(403, { reason: "origin" });

  const device = request.headers.get("x-akari-device")?.trim().toLowerCase() ?? "";
  if (!DEVICE_ID.test(device)) return json(400, { reason: "device" });

  return endpoint === "/photo" ? photo(request, env, ctx, device) : meal(request, env, ctx, device);
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
  const refused = await spend(request, env, ctx, device);
  if (refused) return refused;

  const language = languageOf(request);
  const hint = sanitiseHint(request.headers.get("x-akari-hint"));
  const build = buildOf(request);

  const started = Date.now();
  try {
    const message = await ask(env.ANTHROPIC_API_KEY, {
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
    return json(200, answer);
  } catch (error) {
    console.log(JSON.stringify({ photo: "upstream", ms: Date.now() - started, ...scoreboardLog(env, device), status: error instanceof APIError ? error.status ?? "network" : "answer" }));
    return json(503, { reason: "upstream" });
  }
}

async function meal(request: Request, env: Env, ctx: ExecutionContext, device: string): Promise<Response> {
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
  const input = readMealRequest(body);
  if (!input) return json(400, { reason: "malformed" });

  if (!env.ANTHROPIC_API_KEY) return json(503, { reason: "unconfigured" });
  const refused = await spend(request, env, ctx, device);
  if (refused) return refused;

  const language = languageOf(request);
  const build = buildOf(request);

  const started = Date.now();
  try {
    const message = await ask(env.ANTHROPIC_API_KEY, {
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
    return json(200, answer);
  } catch (error) {
    console.log(JSON.stringify({ meal: "upstream", ms: Date.now() - started, ...scoreboardLog(env, device), status: error instanceof APIError ? error.status ?? "network" : "answer" }));
    return json(503, { reason: "upstream" });
  }
}

// Checks the device, address and global allowance and spends one from each, or
// answers the 429 that says which ran out. The scoreboard device spends only the
// global allowance.
async function spend(request: Request, env: Env, ctx: ExecutionContext, device: string): Promise<Response | null> {
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
  const counts = await Promise.all(counters.map(async (c) => Number(await env.PHOTO_COUNTERS.get(c.key)) || 0));
  const hit = counters.find((c, i) => counts[i] >= c.cap);
  if (hit) return json(429, { reason: hit.reason });

  // Count the attempt before asking, so failed calls still spend the day's allowance.
  // KV allows one write per key per second; a lost increment under load is acceptable.
  ctx.waitUntil(
    Promise.all(
      counters.map((c, i) =>
        env.PHOTO_COUNTERS.put(c.key, String(counts[i] + 1), { expirationTtl: COUNTER_TTL_SECONDS }).catch(() => {}),
      ),
    ),
  );
  return null;
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

// The salt expires when its day ends; that day's counters are never read after it.
// KV has no insert-if-absent, so two isolates racing on a day's first photo may each
// keep their own salt, which only splits that day's counts the way a lost increment does.
async function dailySalt(env: Env, day: string): Promise<string> {
  if (cachedSalt?.day === day) return cachedSalt.salt;
  const key = `salt:${day}`;
  let salt = await env.PHOTO_COUNTERS.get(key);
  if (!salt) {
    salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const midnight = Date.parse(`${day}T00:00:00Z`) / 1000 + 86_400;
    // KV refuses an expiration less than 60 s away.
    await env.PHOTO_COUNTERS.put(key, salt, { expiration: Math.max(midnight, Math.ceil(Date.now() / 1000) + 60) });
  }
  cachedSalt = { day, salt };
  return salt;
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
