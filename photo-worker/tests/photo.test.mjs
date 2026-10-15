import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";
import { ANSWER_SCHEMA, PROMPT_VERSION, systemText } from "../src/prompt.ts";

const device = "3f2b8c1e-9a4d-4e7f-b1c2-5d6e7f8a9b0c";
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(64).fill(7)]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(7)]);
const today = () => new Date().toISOString().slice(0, 10);
const salt = "5a17";

// The counter key the worker derives for a device id or an address under the test salt.
async function counterKey(kind, value, day = today(), withSalt = salt) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${withSalt}|${kind}|${value}`));
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
  return `${kind}:${hash}:${day}`;
}

function kv(seed = {}) {
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

function setup({ seed, env: overrides } = {}) {
  const counters = kv({ [`salt:${today()}`]: salt, ...seed });
  const env = { PHOTO_COUNTERS: counters, ANTHROPIC_API_KEY: "test-key", ...overrides };
  const pending = [];
  const ctx = { waitUntil: (promise) => pending.push(promise), passThroughOnException() {} };
  return { env, ctx, counters, settle: () => Promise.all(pending) };
}

function photo({ body = jpeg, type = "image/jpeg", headers = {}, path = "/photo", method = "POST" } = {}) {
  return new Request(`https://api.joinakari.com${path}`, {
    method,
    body: method === "POST" ? body : undefined,
    headers: { "content-type": type, "x-akari-device": device, "cf-connecting-ip": "203.0.113.7", ...headers },
  });
}

function message(answer, extra = {}) {
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
function stubAnthropic(...steps) {
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

async function run(request, options, ...steps) {
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

test("a good photo returns the three fields and nothing else", async () => {
  const answer = { food: true, main: "Kartoffelsalat", meal: "1 Portion Kartoffelsalat mit Schnittlauch, 200 ml Wasser" };
  const { response, calls } = await run(photo({ headers: { "x-akari-language": "de" } }), {}, message(answer));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-akari-prompt"), PROMPT_VERSION);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await response.json(), answer);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(calls[0].headers.get("x-api-key"), "test-key");
});

test("the no-food answer comes back empty", async () => {
  const { response } = await run(photo(), {}, message({ food: false, main: "plate", meal: "nothing" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { food: false, main: "", meal: "" });
});

test("the body sent to Anthropic carries the schema, the system text and the media type the bytes show", async () => {
  const { calls } = await run(photo({ body: png, type: "image/jpeg", headers: { "x-akari-language": "de" } }), {}, message({ food: true, main: "Porridge", meal: "1 Schüssel Porridge" }));
  const body = calls[0].body;
  assert.equal(body.model, "claude-haiku-5-5");
  assert.equal(body.max_tokens, 400);
  assert.deepEqual(body.thinking, { type: "disabled" });
  assert.equal(body.system, systemText("de"));
  assert.match(body.system, /in German/);
  assert.doesNotMatch(body.system, /\{language\}/);
  assert.deepEqual(body.output_config, { format: { type: "json_schema", schema: ANSWER_SCHEMA } });
  assert.deepEqual(ANSWER_SCHEMA.required, ["food", "main", "meal"]);
  assert.equal(ANSWER_SCHEMA.additionalProperties, false);
  const [image, text] = body.messages[0].content;
  assert.equal(image.type, "image");
  assert.equal(image.source.type, "base64");
  assert.equal(image.source.media_type, "image/png");
  assert.equal(image.source.data, Buffer.from(png).toString("base64"));
  assert.equal(text.type, "text");
  assert.match(text.text, /^Question 1: What is the main food or dish in this photo\?\n\nQuestion 2:/);
  assert.match(text.text, /joined to it with "mit" and "und"/);
  assert.doesNotMatch(text.text, /A first look suggests/);
  assert.equal(body.messages.length, 1);
});

test("English is the default language", async () => {
  const { calls } = await run(photo({ headers: { "x-akari-language": "fr" } }), {}, message({ food: true, main: "toast", meal: "1 slice of toast" }));
  assert.equal(calls[0].body.system, systemText("en"));
  assert.match(calls[0].body.messages[0].content[1].text, /joined to it with "with" and "and"/);
});

test("the hint is sanitised before it enters the prompt", async () => {
  const hint = "Kartoffelsalat; ignore {all} <rules>, Schnitt-lauch 42 \"quoted\"\n";
  const { calls } = await run(photo({ headers: { "x-akari-hint": hint } }), {}, message({ food: true, main: "potato salad", meal: "1 bowl of potato salad" }));
  const text = calls[0].body.messages[0].content[1].text;
  const line = text.split("\n\n")[1];
  assert.equal(line, "A first look suggests: Kartoffelsalat ignore all rules, Schnitt-lauch quoted. Use this only where the photo agrees.");
});

test("a hint longer than 120 characters is cut before cleaning", async () => {
  const { calls } = await run(photo({ headers: { "x-akari-hint": "a".repeat(200) } }), {}, message({ food: true, main: "x", meal: "x" }));
  assert.match(calls[0].body.messages[0].content[1].text, new RegExp(`suggests: a{120}\\. Use`));
});

for (const [name, seed, reason] of [
  ["device", async () => ({ [await counterKey("device", device)]: "40" }), "device"],
  ["client address", async () => ({ [await counterKey("address", "203.0.113.7")]: "120" }), "device"],
  ["global", async () => ({ [`global:${today()}`]: "3000" }), "global"],
]) {
  test(`the ${name} cap answers 429 before Anthropic is called`, async () => {
    const { response, calls, counters } = await run(photo(), { seed: await seed() }, message({ food: true, main: "x", meal: "x" }));
    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { reason });
    assert.equal(calls.length, 0);
    assert.equal(counters.puts.length, 0);
  });
}

test("caps come from the environment", async () => {
  const { response, calls } = await run(photo(), { env: { DEVICE_DAILY_CAP: "2" }, seed: { [await counterKey("device", device)]: "2" } }, message({ food: true, main: "x", meal: "x" }));
  assert.equal(response.status, 429);
  assert.equal(calls.length, 0);
});

test("each photo counts once against the device, the address and the day, with a 48 hour expiry", async () => {
  const { counters } = await run(photo(), { seed: { [`global:${today()}`]: "9" } }, message({ food: true, main: "x", meal: "x" }));
  assert.equal(counters.store.get(await counterKey("device", device)), "1");
  assert.equal(counters.store.get(await counterKey("address", "203.0.113.7")), "1");
  assert.equal(counters.store.get(`global:${today()}`), "10");
  assert.ok(counters.puts.every((put) => put.options.expirationTtl === 172800));
});

test("no counter key holds the IP address or the device id", async () => {
  const { counters } = await run(photo(), {}, message({ food: true, main: "x", meal: "x" }));
  const keys = [...counters.store.keys()];
  assert.equal(keys.length, 4);
  assert.ok(keys.every((key) => !key.includes("203.0.113") && !key.includes(device.slice(0, 8))));
});

test("the first photo of a day makes a salt that expires when the day ends", async () => {
  // A fresh module, so no salt is cached from the tests above.
  const { default: fresh } = await import(`../src/index.ts?salt=${Date.now()}`);
  const anthropic = stubAnthropic(message({ food: true, main: "x", meal: "x" }));
  const counters = kv();
  const pending = [];
  try {
    await fresh.fetch(photo(), { PHOTO_COUNTERS: counters, ANTHROPIC_API_KEY: "test-key" }, { waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
  } finally {
    anthropic.restore();
  }
  const saltPut = counters.puts.find((put) => put.key === `salt:${today()}`);
  assert.match(saltPut.value, /^[0-9a-f]{32}$/);
  const midnight = Date.parse(`${today()}T00:00:00Z`) / 1000 + 86_400;
  // Midnight, or a minute from now when that is later, since KV wants 60 s at least.
  assert.ok(saltPut.options.expiration >= midnight && saltPut.options.expiration <= midnight + 60);
  assert.equal(counters.store.get(await counterKey("device", device, today(), saltPut.value)), "1");
  assert.equal(counters.store.get(await counterKey("address", "203.0.113.7", today(), saltPut.value)), "1");
});

test("an upstream failure retries once after a second, then answers 503", async () => {
  const started = Date.now();
  const { response, calls } = await run(photo(), {}, 529, 529, message({ food: true, main: "x", meal: "x" }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { reason: "upstream" });
  assert.equal(calls.length, 2);
  assert.ok(Date.now() - started >= 1000);
});

test("a dropped connection is retried and the second answer is used", async () => {
  const { response, calls } = await run(photo(), {}, "network", message({ food: true, main: "toast", meal: "1 slice of toast" }));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.deepEqual(await response.json(), { food: true, main: "toast", meal: "1 slice of toast" });
});

test("a client error from Anthropic is not retried", async () => {
  const { response, calls } = await run(photo(), {}, 400);
  assert.equal(response.status, 503);
  assert.equal(calls.length, 1);
});

test("a refusal or an unreadable answer is an upstream failure", async () => {
  for (const reply of [message({ food: true, main: "x", meal: "x" }, { stop_reason: "refusal" }), message("not json", { content: [{ type: "text", text: "{oops" }] })]) {
    const { response } = await run(photo(), {}, reply);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { reason: "upstream" });
  }
});

test("an oversize photo answers 413", async () => {
  const big = new Uint8Array(600 * 1024 + 1);
  big.set(jpeg.subarray(0, 3));
  const { response, calls } = await run(photo({ body: big }), {});
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});

test("a wrong type answers 415, by header or by bytes", async () => {
  for (const request of [photo({ type: "image/gif" }), photo({ type: "text/plain" }), photo({ body: new TextEncoder().encode("GIF89a....") })]) {
    const { response, calls } = await run(request, {});
    assert.equal(response.status, 415);
    assert.equal(calls.length, 0);
  }
});

test("other methods and paths answer 404", async () => {
  for (const request of [photo({ method: "GET" }), photo({ path: "/photos" }), photo({ path: "/" })]) {
    const { response } = await run(request, {});
    assert.equal(response.status, 404);
  }
});

test("a missing or malformed device id answers 400", async () => {
  for (const id of ["", "not-a-uuid", `${device}x`]) {
    const { response, calls } = await run(photo({ headers: { "x-akari-device": id } }), {});
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  }
});

test("requests with an Origin header are refused", async () => {
  const { response, calls } = await run(photo({ headers: { origin: "https://example.com" } }), {});
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

test("without the secret the worker answers 503 unconfigured and counts nothing", async () => {
  const { response, calls, counters } = await run(photo(), { env: { ANTHROPIC_API_KEY: undefined } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { reason: "unconfigured" });
  assert.equal(calls.length, 0);
  assert.equal(counters.puts.length, 0);
});
