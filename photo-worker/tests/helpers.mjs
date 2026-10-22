import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
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

// A D1 stand-in: SQLite in memory with the worker's migrations, behind D1's
// prepare().bind() with run(), first(), all() and batch(). Seed counters by key,
// as { key: count }; the day is the key's last ten characters. It keeps every
// statement and batch, and `written` counts the rows each one changed.
export function d1(seed = {}, salts = {}) {
  const db = new DatabaseSync(":memory:");
  const migrations = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(migrations).sort()) db.exec(readFileSync(new URL(file, migrations), "utf8"));
  for (const [key, count] of Object.entries(seed)) db.prepare("INSERT INTO counters (key, day, count) VALUES (?, ?, ?)").run(key, key.slice(-10), count);
  for (const [day, salt] of Object.entries(salts)) db.prepare("INSERT INTO salts (day, salt) VALUES (?, ?)").run(day, salt);

  const fake = {
    db,
    statements: [],
    batches: [],
    written: 0,
    count: (key) => db.prepare("SELECT count FROM counters WHERE key = ?").get(key)?.count,
    keys: () => db.prepare("SELECT key FROM counters ORDER BY key").all().map((row) => row.key),
    salts: () => db.prepare("SELECT day, salt FROM salts ORDER BY day").all().map((row) => ({ ...row })),
    usage: () => db.prepare("SELECT * FROM usage_days ORDER BY day, endpoint").all().map((row) => ({ ...row })),
    prepare: (sql) => statement(sql, []),
    async batch(statements) {
      fake.batches.push(statements);
      db.exec("BEGIN");
      try {
        const results = statements.map((s) => execute(s, true));
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  function statement(sql, values) {
    const self = {
      sql,
      values,
      bind: (...bound) => statement(sql, bound),
      run: async () => execute(self, false),
      all: async () => execute(self, false),
      first: async () => execute(self, false).results[0] ?? null,
    };
    return self;
  }
  function execute(s, inBatch) {
    fake.statements.push({ sql: s.sql, values: s.values, inBatch });
    const prepared = db.prepare(s.sql);
    if (prepared.columns().length) return { success: true, results: prepared.all(...s.values).map((row) => ({ ...row })), meta: {} };
    const { changes } = prepared.run(...s.values);
    fake.written += changes;
    return { success: true, results: [], meta: { changes } };
  }
  return fake;
}

export function setup({ seed, salts = { [today()]: salt }, env: overrides } = {}) {
  const counters = d1(seed, salts);
  const env = { COUNTERS: counters, ANTHROPIC_API_KEY: "test-key", ...overrides };
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

