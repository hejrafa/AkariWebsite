import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";

const statements = [];
const env = {
  ADMIN_HOST: "admin.example.com",
  API_HOST: "api.example.com",
  SITE_HOST: "example.com",
  ADMIN_EMAIL: "owner@example.com",
  ADMIN_PASSWORD_HASH: "",
  SESSION_SECRET: "test-only-signing-secret",
  ASSETS: { fetch: async () => new Response("dashboard") },
  DB: {
    prepare: (sql) => ({
      bind: (...values) => ({
        run: async () => {
          statements.push({ sql, values });
          return { meta: { changes: 1 } };
        },
        first: async () => (sql.includes("site_visit_salts") ? { salt: "today-salt" } : { views: 0, visitors: 0 }),
        all: async () => ({ results: [] }),
      }),
    }),
  },
};

const browser = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

function visit(body, headers = {}) {
  return worker.fetch(new Request("https://api.example.com/v1/visit", {
    method: "POST",
    headers: { origin: "https://example.com", "user-agent": browser, "cf-connecting-ip": "203.0.113.7", "content-type": "text/plain", ...headers },
    body: JSON.stringify(body),
  }), env);
}

const visitInserts = () => statements.filter((statement) => statement.sql.includes("INSERT INTO site_visits"));

test("a visit keeps only page, source and country, under a daily hash", async () => {
  const response = await visit({ path: "/privacy/index.html", source: "www.News.Example.org", device: "mobile", language: "de" });
  assert.equal(response.status, 204);
  const [insert] = visitInserts();
  assert.ok(insert);
  assert.doesNotMatch(insert.sql, /device|language/);
  const [, day, path, source, , visitor] = insert.values;
  assert.equal(day, new Date().toISOString().slice(0, 10));
  assert.equal(path, "/privacy/");
  assert.equal(source, "news.example.org");
  assert.match(visitor, /^[a-f0-9]{16}$/);
  const stored = JSON.stringify(insert.values);
  assert.doesNotMatch(stored, /203\.0\.113\.7/);
  assert.doesNotMatch(stored, /iPhone/);
});

test("visits from other sites, bots or with odd paths are dropped quietly", async () => {
  const before = visitInserts().length;
  assert.equal((await visit({ path: "/" }, { origin: "https://elsewhere.example" })).status, 204);
  assert.equal((await visit({ path: "/" }, { "user-agent": "Googlebot/2.1" })).status, 204);
  assert.equal((await visit({ path: "https://example.com/" })).status, 204);
  assert.equal((await visit({ path: "/<script>" })).status, 204);
  assert.equal(visitInserts().length, before);
});

test("visit stats need an admin session and cover the requested days", async () => {
  const denied = await worker.fetch(new Request("https://admin.example.com/admin-api/visits"), env);
  assert.equal(denied.status, 401);

  const response = await worker.fetch(new Request("http://localhost/admin-api/visits?days=7"), env);
  assert.equal(response.status, 200);
  const stats = await response.json();
  assert.equal(stats.days, 7);
  assert.equal(stats.daily.length, 7);
  assert.equal(stats.daily.at(-1).day, new Date().toISOString().slice(0, 10));
  assert.deepEqual(Object.keys(stats.breakdowns), ["pages", "sources", "countries"]);

  const fallback = await (await worker.fetch(new Request("http://localhost/admin-api/visits?days=12"), env)).json();
  assert.equal(fallback.days, 30);
});
