import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.ts";
import { cloudflareQuery, parseCloudflare, readCloudflare, storeCloudflare } from "../src/cloudflare.ts";

const account = "0123456789abcdef0123456789abcdef";
const zone = "fedcba9876543210fedcba9876543210";
const token = { CF_ANALYTICS_TOKEN: "test-analytics-token", CF_ACCOUNT_ID: account, CF_ZONE_ID: zone };
const dayAt = (offset) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

// D1's statement API, batch included, over an in-memory SQLite database with every migration applied.
function database() {
  const db = new DatabaseSync(":memory:");
  const folder = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(folder).sort()) db.exec(readFileSync(new URL(file, folder), "utf8"));
  const statement = (sql, values = []) => ({
    sql,
    values,
    bind: (...next) => statement(sql, next),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...values).changes) } }),
    first: async () => db.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...values) }),
  });
  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      db.exec("BEGIN");
      for (const { sql, values } of statements) db.prepare(sql).run(...values);
      db.exec("COMMIT");
      return statements.map(() => ({ meta: {} }));
    },
    sqlite: db,
  };
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
    DB: database(),
    ...extra,
  };
}

// What the GraphQL Analytics API answers for yesterday (index 0) and today (index 1): the
// Workers aliases per day, D1 per day, each database's size per day, and the zone per day.
function answer([yesterday, today]) {
  return {
    data: {
      viewer: {
        accounts: [{
          workers0: [{ sum: { requests: 41_250, errors: 12 } }],
          workers1: [{ sum: { requests: 18_400, errors: 3 } }],
          d1AnalyticsAdaptiveGroups: [
            { sum: { rowsRead: 2_310_000, rowsWritten: 61_000 }, dimensions: { date: yesterday } },
            { sum: { rowsRead: 880_000, rowsWritten: 21_500 }, dimensions: { date: today } },
          ],
          d1StorageAdaptiveGroups: [
            { max: { databaseSizeBytes: 104_857_600 }, dimensions: { date: yesterday, databaseId: "feedback" } },
            { max: { databaseSizeBytes: 2_097_152 }, dimensions: { date: yesterday, databaseId: "counters" } },
            { max: { databaseSizeBytes: 105_906_176 }, dimensions: { date: today, databaseId: "feedback" } },
            { max: { databaseSizeBytes: 2_097_152 }, dimensions: { date: today, databaseId: "counters" } },
          ],
        }],
        zones: [{
          httpRequests1dGroups: [
            { sum: { requests: 9_120 }, dimensions: { date: yesterday } },
            { sum: { requests: 3_045 }, dimensions: { date: today } },
          ],
        }],
      },
    },
    errors: null,
  };
}

const requests = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  const body = JSON.parse(init.body ?? "{}");
  requests.push({ url, authorization: new Headers(init.headers).get("authorization"), query: body.query });
  if (url.href !== "https://api.cloudflare.com/client/v4/graphql") return new Response("not found", { status: 404 });
  return Response.json(answer([dayAt(1), dayAt(0)]));
};

test("the query asks for yesterday and today, every script and database, and the zone", () => {
  const query = cloudflareQuery(account, zone, ["2026-10-21", "2026-10-22"]);
  assert.match(query, /accounts\(filter: \{ accountTag: "0123456789abcdef0123456789abcdef" \}\)/);
  assert.match(query, /workers0: workersInvocationsAdaptive\(limit: 1, filter: \{ datetime_geq: "2026-10-21T00:00:00Z", datetime_leq: "2026-10-21T23:59:59Z" \}\)/);
  assert.match(query, /workers1: workersInvocationsAdaptive\(limit: 1, filter: \{ datetime_geq: "2026-10-22T00:00:00Z", datetime_leq: "2026-10-22T23:59:59Z" \}\)/);
  assert.doesNotMatch(query, /scriptName|databaseId:/);
  assert.match(query, /d1AnalyticsAdaptiveGroups\(limit: 100, filter: \{ date_geq: "2026-10-21", date_leq: "2026-10-22" \}\)/);
  assert.match(query, /max \{ databaseSizeBytes \}/);
  assert.match(query, /zones\(filter: \{ zoneTag: "fedcba9876543210fedcba9876543210" \}\)/);
  assert.doesNotMatch(cloudflareQuery(account, null, ["2026-10-21", "2026-10-22"]), /zones|httpRequests1dGroups/);
});

test("the refresh parses the GraphQL answer and stores one row per day", async () => {
  const days = ["2026-10-21", "2026-10-22"];
  const parsed = parseCloudflare(answer(days), days, true);
  assert.deepEqual(parsed, [
    { day: "2026-10-21", workerRequests: 41_250, workerErrors: 12, d1RowsRead: 2_310_000, d1RowsWritten: 61_000, d1Bytes: 106_954_752, pagesRequests: 9_120 },
    { day: "2026-10-22", workerRequests: 18_400, workerErrors: 3, d1RowsRead: 880_000, d1RowsWritten: 21_500, d1Bytes: 108_003_328, pagesRequests: 3_045 },
  ]);

  const env = environment();
  await storeCloudflare(env, parsed, "2026-10-22T06:00:00.000Z");
  // The next run replaces the day's row instead of adding one.
  await storeCloudflare(env, [{ ...parsed[1], workerRequests: 30_000 }], "2026-10-22T09:30:00.000Z");
  const rows = env.DB.sqlite.prepare("SELECT * FROM cloudflare_days ORDER BY day").all().map((row) => ({ ...row }));
  assert.deepEqual(rows, [
    { day: "2026-10-21", taken_at: "2026-10-22T06:00:00.000Z", worker_requests: 41_250, worker_errors: 12, d1_rows_read: 2_310_000, d1_rows_written: 61_000, d1_bytes: 106_954_752, pages_requests: 9_120 },
    { day: "2026-10-22", taken_at: "2026-10-22T09:30:00.000Z", worker_requests: 30_000, worker_errors: 3, d1_rows_read: 880_000, d1_rows_written: 21_500, d1_bytes: 108_003_328, pages_requests: 3_045 },
  ]);
});

test("a day with no events counts 0, storage stays unknown, and errors are Cloudflare's words", () => {
  const days = ["2026-10-21", "2026-10-22"];
  const quiet = parseCloudflare({ data: { viewer: { accounts: [{ workers0: [], workers1: [], d1AnalyticsAdaptiveGroups: [], d1StorageAdaptiveGroups: [] }] } } }, days, false);
  assert.deepEqual(quiet[0], { day: "2026-10-21", workerRequests: 0, workerErrors: 0, d1RowsRead: 0, d1RowsWritten: 0, d1Bytes: null, pagesRequests: null });
  assert.throws(() => parseCloudflare({ data: null, errors: [{ message: "not authorized for that account" }] }, days, false), {
    message: "Cloudflare answered: not authorized for that account",
  });
  assert.throws(() => parseCloudflare({ data: { viewer: { accounts: [] } } }, days, false), /without the account/);
});

test("refreshing needs a session and the token, and waits 15 minutes between runs", async () => {
  const env = environment(token);
  const refresh = () => worker.fetch(new Request("http://localhost/admin-api/cloudflare/refresh", { method: "POST" }), env);

  const denied = await worker.fetch(new Request("https://admin.example.com/admin-api/cloudflare/refresh", { method: "POST" }), env);
  assert.equal(denied.status, 401);

  const before = requests.length;
  const missing = await worker.fetch(new Request("http://localhost/admin-api/cloudflare/refresh", { method: "POST" }), environment());
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: "token_missing" });
  assert.equal(requests.length, before);

  const first = await refresh();
  assert.equal(first.status, 200);
  const data = await first.json();
  assert.equal(data.configured, true);
  assert.deepEqual({ ...data.latest, takenAt: undefined }, {
    day: dayAt(0), takenAt: undefined, workerRequests: 18_400, workerErrors: 3, d1RowsRead: 880_000, d1RowsWritten: 21_500, d1Bytes: 108_003_328, pagesRequests: 3_045,
  });
  assert.equal(requests.length, before + 1);
  assert.equal(requests.at(-1).authorization, "Bearer test-analytics-token");
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS count FROM cloudflare_days").get().count, 2);

  const again = await refresh();
  assert.equal(again.status, 429);
  const body = await again.json();
  assert.equal(body.error, "rate_limited");
  assert.ok(body.retryAfter > 840 && body.retryAfter <= 900, `retryAfter ${body.retryAfter}`);
  assert.equal(again.headers.get("retry-after"), String(body.retryAfter));
  assert.equal(requests.length, before + 1);
});

test("the dashboard API returns the limits, the latest day and a 30-day trend", async () => {
  const env = environment();
  const denied = await worker.fetch(new Request("https://admin.example.com/admin-api/cloudflare"), env);
  assert.equal(denied.status, 401);

  const empty = await (await worker.fetch(new Request("http://localhost/admin-api/cloudflare"), env)).json();
  assert.equal(empty.configured, false);
  assert.equal(empty.latest, null);
  assert.deepEqual(empty.limits, { workerRequests: 100_000, d1RowsRead: 5_000_000, d1RowsWritten: 100_000, d1StorageBytes: 5_000_000_000 });
  assert.match(empty.limitsAsOf, /^\d{4}-\d{2}-\d{2}$/);

  const day = { workerRequests: 0, workerErrors: 0, d1RowsRead: 0, d1RowsWritten: 0, d1Bytes: null, pagesRequests: null };
  await storeCloudflare(env, [{ ...day, day: dayAt(40), workerRequests: 1 }, { ...day, day: dayAt(3), workerRequests: 2_000 }, { ...day, day: dayAt(0), workerRequests: 9_000, workerErrors: 4 }], new Date().toISOString());
  const data = await readCloudflare({ ...env, ...token, CF_LIMIT_WORKER_REQUESTS: "200000", CF_LIMIT_D1_ROWS_READ: "-1" });
  assert.equal(data.configured, true);
  assert.equal(data.limits.workerRequests, 200_000);
  assert.equal(data.limits.d1RowsRead, 5_000_000);
  assert.equal(data.latest.day, dayAt(0));
  assert.equal(data.trend.length, 30);
  assert.deepEqual(data.trend.at(-1), { day: dayAt(0), requests: 9_000, errors: 4 });
  assert.equal(data.trend.at(-4).requests, 2_000);
  assert.equal(data.trend.filter((point) => point.requests !== null).length, 2);
});

test("the daily run does nothing without the token", async () => {
  const before = requests.length;
  const waits = [];
  await worker.scheduled({}, environment(), { waitUntil: (promise) => waits.push(promise) });
  await Promise.all(waits);
  assert.equal(requests.length, before);
});
