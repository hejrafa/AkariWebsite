import assert from "node:assert/strict";
import { createHash, pbkdf2Sync } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.ts";

const ownerEmail = "owner@example.com";
const ownerPassword = "owner-test-password";
const salt = Buffer.from("d1ccfbf2fbda45e997b3292fe439f120", "hex");
const device = "3f2b8c1e-9a4d-4e7f-b1c2-5d6e7f8a9b0c";

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
    sqlite: db,
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function environment() {
  return {
    ADMIN_HOST: "admin.example.com",
    API_HOST: "api.example.com",
    SITE_HOST: "example.com",
    ADMIN_EMAIL: ownerEmail,
    ADMIN_PASSWORD_HASH: `pbkdf2-sha256:100000:${salt.toString("hex")}:${pbkdf2Sync(ownerPassword, salt, 100_000, 32, "sha256").toString("hex")}`,
    SESSION_SECRET: "test-only-signing-secret",
    ASSETS: { fetch: async () => new Response("dashboard") },
    DB: database(),
  };
}

function post(env, body, headers = { "x-akari-device": device }) {
  return worker.fetch(new Request("https://api.example.com/v1/missing-food", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }), env);
}

const rows = (env) => env.DB.sqlite.prepare("SELECT name, language, count, resolved FROM missing_foods ORDER BY name, language").all().map((row) => ({ ...row }));

async function session(env) {
  const response = await worker.fetch(new Request("https://admin.example.com/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
  }), env);
  return response.headers.get("set-cookie").split(";")[0];
}

function admin(env, path, options = {}) {
  return worker.fetch(new Request(`https://admin.example.com${path}`, options), env);
}

test("names are folded before counting, and a name counts once per post", async () => {
  const env = environment();
  assert.equal((await post(env, { names: ["  Sushi Rice ", "Nori", "sushi   rice"], language: "en" })).status, 200);
  const second = await post(env, { names: ["SUSHI RICE", "Käse", "Kase"], language: "en" });
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), { counted: 3 });
  // The same name in German is its own row.
  assert.equal((await post(env, { names: ["Nori"], language: "de" })).status, 200);
  assert.deepEqual(rows(env), [
    { name: "kase", language: "en", count: 1, resolved: 0 },
    { name: "käse", language: "en", count: 1, resolved: 0 },
    { name: "nori", language: "de", count: 1, resolved: 0 },
    { name: "nori", language: "en", count: 1, resolved: 0 },
    { name: "sushi rice", language: "en", count: 2, resolved: 0 },
  ]);
  const seen = env.DB.sqlite.prepare("SELECT first_seen, last_seen FROM missing_foods WHERE name = 'sushi rice'").get();
  assert.ok(seen.first_seen <= seen.last_seen);
});

test("nothing but the folded name, language, count and dates is stored", async () => {
  const env = environment();
  await post(env, { names: ["Miso soup"], language: "en", extra: "kept?" });
  const columns = env.DB.sqlite.prepare("SELECT * FROM missing_foods").get();
  assert.deepEqual(Object.keys(columns).sort(), ["count", "first_seen", "language", "last_seen", "name", "resolved"]);
  const posts = env.DB.sqlite.prepare("SELECT * FROM missing_food_posts").all();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].installation_hash, createHash("sha256").update(device).digest("hex"));
  assert.doesNotMatch(JSON.stringify(posts), new RegExp(device));
});

test("malformed requests answer 400 and count nothing", async () => {
  const env = environment();
  for (const body of [
    "{not json",
    [],
    { names: ["Nori"] },
    { names: ["Nori"], language: "fr" },
    { names: [], language: "en" },
    { names: "Nori", language: "en" },
    { names: [7], language: "en" },
    { names: ["x".repeat(61)], language: "en" },
    { names: Array.from({ length: 21 }, (_, i) => `food ${i}`), language: "en" },
    { names: ["   "], language: "en" },
  ]) {
    const response = await post(env, body);
    assert.equal(response.status, 400, JSON.stringify(body).slice(0, 60));
  }
  for (const headers of [{}, { "x-akari-device": "short" }]) {
    assert.equal((await post(env, { names: ["Nori"], language: "en" }, headers)).status, 400);
  }
  assert.deepEqual(rows(env), []);
  // Twenty names of sixty characters is the most a post may carry.
  assert.equal((await post(env, { names: Array.from({ length: 20 }, (_, i) => `${i}`.padEnd(60, "x")), language: "en" })).status, 200);
});

test("a device is capped at 50 posts in 24 hours, under the hash food reports use", async () => {
  const env = environment();
  const hash = createHash("sha256").update(device).digest("hex");
  const insert = env.DB.sqlite.prepare("INSERT INTO missing_food_posts (installation_hash, created_at) VALUES (?, ?)");
  const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  for (let i = 0; i < 49; i++) insert.run(hash, recent);
  for (let i = 0; i < 10; i++) insert.run(hash, old);

  assert.equal((await post(env, { names: ["Nori"], language: "en" })).status, 200);
  const refused = await post(env, { names: ["Nori"], language: "en" });
  assert.equal(refused.status, 429);
  assert.deepEqual(await refused.json(), { error: "rate_limited" });
  assert.equal(rows(env)[0].count, 1);
  // Another device still counts.
  assert.equal((await post(env, { names: ["Nori"], language: "en" }, { "x-akari-device": "aaaaaaaa-0000-4000-8000-000000000000" })).status, 200);
  assert.equal(rows(env)[0].count, 2);

  // The daily cron deletes rows older than a day.
  const pending = [];
  await worker.scheduled({}, { ...env, ASC_KEY_ID: undefined }, { waitUntil: (promise) => pending.push(promise) });
  await Promise.allSettled(pending);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM missing_food_posts WHERE created_at < ?").get(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).n, 0);
});

test("the admin list is ordered by count, and resolve sets and clears the flag", async () => {
  const env = environment();
  await post(env, { names: ["Nori", "Miso soup"], language: "en" });
  await post(env, { names: ["Nori"], language: "en" });
  await post(env, { names: ["Nori", "Sushi rice"], language: "en" });
  await post(env, { names: ["Miso soup"], language: "en" });
  const cookie = await session(env);

  const list = async () => (await (await admin(env, "/admin-api/missing-foods", { headers: { cookie } })).json()).foods;
  const foods = await list();
  assert.deepEqual(foods.map((food) => [food.name, food.count, food.resolved]), [["nori", 3, false], ["miso soup", 2, false], ["sushi rice", 1, false]]);
  assert.equal(foods[0].language, "en");
  assert.match(foods[0].firstSeen, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(foods[0].lastSeen, /^\d{4}-\d{2}-\d{2}T/);

  const resolve = (body) => admin(env, "/admin-api/missing-foods/resolve", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await resolve({ name: "nori", language: "en", resolved: true })).status, 200);
  assert.equal((await list()).find((food) => food.name === "nori").resolved, true);
  assert.equal((await resolve({ name: "nori", language: "en", resolved: false })).status, 200);
  assert.equal((await list()).find((food) => food.name === "nori").resolved, false);

  assert.equal((await resolve({ name: "nori", language: "de", resolved: true })).status, 404);
  assert.equal((await resolve({ name: "nori", language: "en" })).status, 400);
  assert.equal((await resolve({ name: "nori", language: "en", resolved: "yes" })).status, 400);
});

test("the admin routes are denied without a session", async () => {
  const env = environment();
  await post(env, { names: ["Nori"], language: "en" });
  const listed = await admin(env, "/admin-api/missing-foods");
  assert.equal(listed.status, 401);
  const resolved = await admin(env, "/admin-api/missing-foods/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "nori", language: "en", resolved: true }) });
  assert.equal(resolved.status, 401);
  assert.equal(rows(env)[0].resolved, 0);
  // A forged cookie is no session either.
  const forged = await admin(env, "/admin-api/missing-foods", { headers: { cookie: "akari_admin_session=e30.forged" } });
  assert.equal(forged.status, 401);
});

test("the API takes missing foods only on the API host, the admin routes only on the admin host", async () => {
  const env = environment();
  const onAdmin = await worker.fetch(new Request("https://admin.example.com/v1/missing-food", {
    method: "POST",
    headers: { "content-type": "application/json", "x-akari-device": device },
    body: JSON.stringify({ names: ["Nori"], language: "en" }),
  }), env);
  assert.equal(onAdmin.status, 404);
  const cookie = await session(env);
  const onApi = await worker.fetch(new Request("https://api.example.com/admin-api/missing-foods", { headers: { cookie } }), env);
  assert.equal(onApi.status, 404);
});
