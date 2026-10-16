import worker from "../src/index.ts";

export const device = "3f2b8c1e-9a4d-4e7f-b1c2-5d6e7f8a9b0c";
export const today = () => new Date().toISOString().slice(0, 10);
const salt = "5a17";

// The counter key the worker derives for a device id or an address under the test salt.
export async function counterKey(kind, value, day = today(), withSalt = salt) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${withSalt}|${kind}|${value}`));
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
  return `${kind}:${hash}:${day}`;
}

export function kv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    puts: [],
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value, options) {
      this.puts.push({ key, value, options });
      store.set(key, value);
    },
  };
}

export function setup({ seed, env: overrides } = {}) {
  const counters = kv({ [`salt:${today()}`]: salt, ...seed });
  const env = { PHOTO_COUNTERS: counters, ANTHROPIC_API_KEY: "test-key", ...overrides };
  const pending = [];
  const ctx = { waitUntil: (promise) => pending.push(promise), passThroughOnException() {} };
  return { env, ctx, counters, settle: () => Promise.all(pending) };
}

export function message(answer, extra = {}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content: [{ type: "text", text: JSON.stringify(answer) }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1800, output_tokens: 40 },
    ...extra,
  };
}

// Replaces global fetch with a scripted Anthropic. Each step is a status code,
// a message body, or "network" for a dropped connection.
export function stubAnthropic(...steps) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input instanceof Request ? input.url : input), headers: new Headers(init?.headers), body: JSON.parse(init.body) });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step === "network") throw new TypeError("fetch failed");
    if (typeof step === "number") {
      return new Response(JSON.stringify({ type: "error", error: { type: "api_error", message: "stub" } }), { status: step, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify(step), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

export async function run(request, options, ...steps) {
  const anthropic = stubAnthropic(...steps);
  const { env, ctx, counters, settle } = setup(options);
  try {
    const response = await worker.fetch(request, env, ctx);
    await settle();
    return { response, calls: anthropic.calls, counters };
  } finally {
    anthropic.restore();
  }
}

