import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";
import { ANSWER_SCHEMA, PROMPT_VERSION, sanitiseHint, systemText, userText } from "./prompt.ts";
import type { Language } from "./prompt.ts";

// POST /photo: one meal photo in, three short fields out. Nothing is stored; the
// daily counters in PHOTO_COUNTERS are the only state, and they expire after 48 h.

export interface Env {
  PHOTO_COUNTERS: KVNamespace;
  ANTHROPIC_API_KEY?: string;
  DEVICE_DAILY_CAP?: string;
  ADDRESS_DAILY_CAP?: string;
  GLOBAL_DAILY_CAP?: string;
}

const MODEL = "claude-haiku-5-5";
const MAX_BYTES = 600 * 1024;
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
  if (request.method !== "POST" || url.pathname !== "/photo") return json(404, { reason: "not_found" });
  // The app is not a browser; anything sending an Origin is.
  if (request.headers.has("origin")) return json(403, { reason: "origin" });

  const device = request.headers.get("x-akari-device")?.trim().toLowerCase() ?? "";
  if (!DEVICE_ID.test(device)) return json(400, { reason: "device" });

  const declared = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (declared !== "image/jpeg" && declared !== "image/png") return json(415, { reason: "type" });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return json(413, { reason: "size" });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return json(413, { reason: "size" });
  const mediaType = sniff(bytes);
  if (!mediaType) return json(415, { reason: "type" });

  if (!env.ANTHROPIC_API_KEY) return json(503, { reason: "unconfigured" });

  const day = new Date().toISOString().slice(0, 10);
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const counters = [
    { key: `device:${device}:${day}`, cap: cap(env.DEVICE_DAILY_CAP, 40), reason: "device" },
    { key: `address:${address}:${day}`, cap: cap(env.ADDRESS_DAILY_CAP, 120), reason: "device" },
    { key: `global:${day}`, cap: cap(env.GLOBAL_DAILY_CAP, 3000), reason: "global" },
  ];
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

  const language: Language = request.headers.get("x-akari-language")?.trim().toLowerCase().startsWith("de") ? "de" : "en";
  const hint = sanitiseHint(request.headers.get("x-akari-hint"));
  const build = request.headers.get("x-akari-build")?.replace(/[^0-9.]/g, "").slice(0, 16) || undefined;

  const started = Date.now();
  try {
    const { answer, usage } = await ask(env.ANTHROPIC_API_KEY, bytes, mediaType, language, hint);
    // Counts only: never the photo, the answer or the device id.
    console.log(JSON.stringify({ photo: "ok", ms: Date.now() - started, prompt: PROMPT_VERSION, build, ...usage }));
    return json(200, answer);
  } catch (error) {
    console.log(JSON.stringify({ photo: "upstream", ms: Date.now() - started, status: error instanceof APIError ? error.status ?? "network" : "answer" }));
    return json(503, { reason: "upstream" });
  }
}

async function ask(apiKey: string, bytes: Uint8Array, mediaType: MediaType, language: Language, hint: string) {
  const client = new Anthropic({ apiKey, maxRetries: 0, fetch: (input, init) => fetch(input, init) });
  const deadline = Date.now() + BUDGET_MS;
  const params: Anthropic.MessageCreateParamsNonStreaming = {
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
  };

  for (let attempt = 0; ; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new UpstreamFailure("budget");
    try {
      const message = await client.messages.create(params, { timeout: remaining });
      return { answer: readAnswer(message), usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens } };
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

function readAnswer(message: Anthropic.Message): Answer {
  if (message.stop_reason !== "end_turn") throw new UpstreamFailure(message.stop_reason ?? "unknown");
  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new UpstreamFailure("no text");
  const parsed: unknown = JSON.parse(text.text);
  if (!parsed || typeof parsed !== "object") throw new UpstreamFailure("shape");
  const { food, main, meal } = parsed as Record<string, unknown>;
  if (typeof food !== "boolean" || typeof main !== "string" || typeof meal !== "string") throw new UpstreamFailure("shape");
  if (!food) return { food: false, main: "", meal: "" };
  return { food: true, main: main.trim().slice(0, 120), meal: meal.trim().slice(0, 400) };
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
