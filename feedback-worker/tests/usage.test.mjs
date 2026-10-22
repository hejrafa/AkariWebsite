import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.ts";
import { costOf, prices, readUsage } from "../src/usage.ts";

// The photo worker's counters database, in memory with its own migrations, behind D1's statement API.
function counters(rows = []) {
  const db = new DatabaseSync(":memory:");
  const folder = new URL("../../photo-worker/migrations/", import.meta.url);
  for (const file of readdirSync(folder).sort()) db.exec(readFileSync(new URL(file, folder), "utf8"));
  const insert = db.prepare(`
    INSERT INTO usage_days (day, endpoint, requests, failures, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of rows) insert.run(row.day, row.endpoint, row.requests, row.failures ?? 0, row.input ?? 0, row.output ?? 0, row.cacheRead ?? 0, row.cacheWrite ?? 0);
  const statement = (sql, values = []) => ({
    bind: (...next) => statement(sql, next),
    first: async () => db.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...values).map((row) => ({ ...row })) }),
  });
  return { prepare: (sql) => statement(sql) };
}

function environment(extra = {}) {
  return {
    ADMIN_HOST: "admin.example.com",
    API_HOST: "api.example.com",
    SITE_HOST: "example.com",
    ADMIN_EMAIL: "owner@example.com",
    ADMIN_PASSWORD_HASH: "",
    SESSION_SECRET: "test-only-signing-secret",
    ASSETS: { fetch: async () => new Response("dashboard") },
    DB: { prepare: () => { throw new Error("the usage endpoint reads only USAGE"); } },
    ...extra,
  };
}

// A Thursday late in October, with rows from earlier this month, September and August.
const now = new Date("2026-10-22T12:00:00Z");
const fixture = [
  { day: "2026-10-22", endpoint: "compose", requests: 10, failures: 1, input: 12_000, output: 2_000, cacheRead: 150_000, cacheWrite: 15_000 },
  { day: "2026-10-22", endpoint: "photo", requests: 4, input: 7_200, output: 160 },
  { day: "2026-10-21", endpoint: "compose", requests: 6, input: 7_000, output: 1_200, cacheRead: 90_000 },
  { day: "2026-10-02", endpoint: "meal", requests: 2, input: 3_000, output: 400 },
  { day: "2026-09-30", endpoint: "compose", requests: 3, input: 3_000, output: 600, cacheRead: 45_000, cacheWrite: 15_000 },
  { day: "2026-09-01", endpoint: "photo", requests: 1, input: 1_800, output: 40 },
  { day: "2026-08-31", endpoint: "compose", requests: 50, input: 100_000, output: 20_000 },
];

test("cost is each token count times its price per million, at Haiku's prices unless set", () => {
  const price = prices({});
  assert.deepEqual(price, { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 });
  // 12,000 × 0.10 + 2,000 × 0.50 + 150,000 × 0.01 + 15,000 × 0.125 = 5,575 millionths of a dollar.
  assert.equal(costOf({ input_tokens: 12_000, output_tokens: 2_000, cache_read_tokens: 150_000, cache_write_tokens: 15_000 }, price), 0.005575);
  assert.equal(costOf({ input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 }, price), 0);

  const set = prices({ AI_PRICE_INPUT: "1", AI_PRICE_OUTPUT: "5", AI_PRICE_CACHE_READ: "0.1", AI_PRICE_CACHE_WRITE: "nonsense" });
  assert.deepEqual(set, { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 0.125 });
  assert.equal(costOf({ input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_tokens: 0, cache_write_tokens: 0 }, set), 6);
});

test("the usage per day and endpoint, today and this month", async () => {
  const usage = await readUsage({ USAGE: counters(fixture) }, 7, now);
  assert.equal(usage.configured, true);
  assert.equal(usage.days, 7);
  assert.equal(usage.daily.length, 7);
  assert.equal(usage.daily[0].day, "2026-10-16");

  const today = usage.daily.at(-1);
  assert.equal(today.day, "2026-10-22");
  assert.deepEqual(today.endpoints.compose, {
    requests: 10, failures: 1, inputTokens: 12_000, outputTokens: 2_000, cacheReadTokens: 150_000, cacheWriteTokens: 15_000, cost: 0.005575,
  });
  // 7,200 × 0.10 + 160 × 0.50 = 800 millionths.
  assert.equal(today.endpoints.photo.cost, 0.0008);
  assert.equal(today.endpoints.meal.requests, 0);
  assert.deepEqual({ requests: today.requests, failures: today.failures, cost: today.cost }, { requests: 14, failures: 1, cost: 0.006375 });
  assert.deepEqual(usage.today, today);

  // 7,000 × 0.10 + 1,200 × 0.50 + 90,000 × 0.01 = 2,200 millionths.
  assert.deepEqual({ requests: usage.daily.at(-2).requests, cost: usage.daily.at(-2).cost }, { requests: 6, cost: 0.0022 });
  assert.equal(usage.daily.filter((day) => day.requests > 0).length, 2);

  // The month so far: today, yesterday and the 2nd (3,000 × 0.10 + 400 × 0.50 = 500 millionths),
  // though the 2nd is outside the 7 days; September and August stay out.
  assert.deepEqual({ since: usage.month.since, requests: usage.month.requests, cost: usage.month.cost }, { since: "2026-10-01", requests: 22, cost: 0.009075 });
});

test("a month's first day starts the month at nothing, though the range reaches back", async () => {
  const usage = await readUsage({ USAGE: counters(fixture) }, 30, new Date("2026-10-01T08:00:00Z"));
  assert.equal(usage.month.since, "2026-10-01");
  assert.equal(usage.month.requests, 0);
  assert.equal(usage.daily.at(-2).day, "2026-09-30");
  assert.equal(usage.daily.at(-2).requests, 3);
});

test("the endpoint needs a session, keeps to 7, 30 or 90 days, and works without the binding", async () => {
  const denied = await worker.fetch(new Request("https://admin.example.com/admin-api/usage"), environment({ USAGE: counters(fixture) }));
  assert.equal(denied.status, 401);

  const week = await (await worker.fetch(new Request("http://localhost/admin-api/usage?days=7"), environment({ USAGE: counters(fixture) }))).json();
  assert.equal(week.days, 7);
  assert.equal(week.daily.at(-1).day, new Date().toISOString().slice(0, 10));
  assert.deepEqual(Object.keys(week.daily[0].endpoints), ["compose", "photo", "meal"]);

  const fallback = await (await worker.fetch(new Request("http://localhost/admin-api/usage?days=12"), environment({ USAGE: counters() }))).json();
  assert.equal(fallback.days, 30);

  const unbound = await worker.fetch(new Request("http://localhost/admin-api/usage?days=90"), environment());
  assert.equal(unbound.status, 200);
  const empty = await unbound.json();
  assert.equal(empty.configured, false);
  assert.equal(empty.daily.length, 90);
  assert.equal(empty.month.cost, 0);
});
