import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";
import { counterKey, device, message, run, setup, stubAnthropic, today } from "./helpers.mjs";

// The log lines are covered by the other tests; here they would only be noise.
console.log = () => {};

const answer = { foods: [{ name: "Banana", role: "side", reference: null, grams: 120, ingredients: [] }], confidence: 0.9 };
const tokens = { input_tokens: 1240, output_tokens: 96, cache_read_input_tokens: 15800, cache_creation_input_tokens: 0 };

function compose() {
  return new Request("https://api.joinakari.com/compose", {
    method: "POST",
    body: JSON.stringify({ text: "a banana", language: "en" }),
    headers: { "content-type": "application/json", "x-akari-device": device, "cf-connecting-ip": "203.0.113.7" },
  });
}

const row = (endpoint, values) => ({
  day: today(),
  endpoint,
  requests: 0,
  failures: 0,
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_write_tokens: 0,
  ...values,
});

test("a compose call writes the day's usage row with the response's token counts", async () => {
  const { response, counters } = await run(compose(), {}, message(answer, { usage: tokens }));
  assert.equal(response.status, 200);
  assert.deepEqual(counters.usage(), [row("compose", { requests: 1, input_tokens: 1240, output_tokens: 96, cache_read_tokens: 15800 })]);
});

test("a second call adds to the same row, cache writes included", async () => {
  const { env, ctx, counters, settle } = setup();
  const anthropic = stubAnthropic(
    message(answer, { usage: { ...tokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 15800 } }),
    message(answer, { usage: tokens }),
  );
  try {
    await worker.fetch(compose(), env, ctx);
    await worker.fetch(compose(), env, ctx);
    await settle();
  } finally {
    anthropic.restore();
  }
  assert.deepEqual(counters.usage(), [row("compose", { requests: 2, input_tokens: 2480, output_tokens: 192, cache_read_tokens: 15800, cache_write_tokens: 15800 })]);
});

test("a failed upstream counts a request and a failure, and no tokens", async () => {
  const { response, counters } = await run(compose(), {}, 400);
  assert.equal(response.status, 503);
  assert.deepEqual(counters.usage(), [row("compose", { requests: 1, failures: 1 })]);
});

test("an answer that fails the checks still counts the tokens it cost", async () => {
  const { response, counters } = await run(compose(), {}, message({ nope: true }, { usage: tokens }));
  assert.equal(response.status, 503);
  assert.deepEqual(counters.usage(), [row("compose", { requests: 1, failures: 1, input_tokens: 1240, output_tokens: 96, cache_read_tokens: 15800 })]);
});

test("each endpoint has its own row, and the row holds counts only", async () => {
  const photo = new Request("https://api.joinakari.com/photo", {
    method: "POST",
    body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(64).fill(7)]),
    headers: { "content-type": "image/jpeg", "x-akari-device": device, "cf-connecting-ip": "203.0.113.7" },
  });
  const { counters } = await run(photo, {}, message({ food: true, main: "Banana", meal: "1 banana" }));
  assert.deepEqual(counters.usage(), [row("photo", { requests: 1, input_tokens: 1800, output_tokens: 40 })]);
  const stored = JSON.stringify(counters.usage());
  assert.doesNotMatch(stored, /banana|Banana|203\.0\.113|3f2b8c1e/);
});

test("a call refused at its cap never reaches Anthropic and counts no usage", async () => {
  const seed = { [await counterKey("device", device)]: 80 };
  const { response, calls, counters } = await run(compose(), { seed }, message(answer, { usage: tokens }));
  assert.equal(response.status, 429);
  assert.equal(calls.length, 0);
  assert.deepEqual(counters.usage(), []);
});

test("the purge keeps usage rows for 400 days", async () => {
  const day = (ago) => new Date(Date.now() - ago * 86_400_000).toISOString().slice(0, 10);
  const { env, ctx, counters, settle } = setup();
  for (const ago of [0, 2, 399, 400, 401, 700]) {
    counters.db.prepare("INSERT INTO usage_days (day, endpoint, requests) VALUES (?, 'compose', 1)").run(day(ago));
  }
  await worker.scheduled({ cron: "0 3 * * *", scheduledTime: Date.now() }, env, ctx);
  await settle();
  assert.deepEqual(counters.usage().map((usage) => usage.day), [day(400), day(399), day(2), day(0)]);
});
