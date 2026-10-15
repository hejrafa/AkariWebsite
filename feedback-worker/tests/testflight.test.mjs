import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.ts";
import { ascClient, ascToken, collectSnapshot, paginate, storeSnapshot } from "../src/testflight.ts";

const api = "https://api.appstoreconnect.apple.com";
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
const key = { ASC_KEY_ID: "TESTKEY123", ASC_ISSUER_ID: "11111111-2222-3333-4444-555555555555", ASC_PRIVATE_KEY: pem };

// D1's statement API over an in-memory SQLite database with every migration applied.
function database() {
  const db = new DatabaseSync(":memory:");
  const folder = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(folder).sort()) db.exec(readFileSync(new URL(file, folder), "utf8"));
  const statement = (sql, values = []) => ({
    bind: (...next) => statement(sql, next),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...values).changes) } }),
    first: async () => db.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...values) }),
  });
  return { prepare: (sql) => statement(sql), sqlite: db };
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

const person = (id, state) => ({ type: "betaTesters", id, attributes: { firstName: `Name ${id}`, lastName: "Tester", email: `${id}@example.com`, state } });

// App Store Connect as the fixtures describe it: five testers over two pages,
// three groups (one with the public link), two builds.
function appStoreConnect(path, query) {
  const page = (data, next, total) => ({ data, links: { self: `${api}${path}`, ...(next ? { next } : {}) }, meta: { paging: { limit: 200, ...(total === undefined ? {} : { total }) } } });
  if (path === "/v1/apps") return { data: [{ type: "apps", id: "app-1", attributes: { bundleId: query.get("filter[bundleId]") } }], links: {} };
  if (path === "/v1/apps/app-1/betaGroups") return page([
    { type: "betaGroups", id: "g-public", attributes: { name: "Public", isInternalGroup: false, publicLinkEnabled: true } },
    { type: "betaGroups", id: "g-friends", attributes: { name: "Friends", isInternalGroup: false, publicLinkEnabled: false } },
    { type: "betaGroups", id: "g-team", attributes: { name: "Team", isInternalGroup: true, publicLinkEnabled: false } },
  ]);
  if (path === "/v1/betaTesters" && query.get("filter[apps]") === "app-1") {
    return query.get("cursor") === "2"
      ? page([person("t3", "INSTALLED"), person("t4", "INSTALLED"), person("t5", "ACCEPTED")], null, 5)
      : page([person("t1", "INSTALLED"), person("t2", "INVITED")], `${api}/v1/betaTesters?filter[apps]=app-1&fields[betaTesters]=state&limit=200&cursor=2`, 5);
  }
  if (path === "/v1/betaTesters" && query.get("filter[betaGroups]") === "g-public") return page([person("t1", "INSTALLED"), person("t3", "INSTALLED"), person("t4", "INSTALLED"), person("t5", "ACCEPTED")], null, 4);
  if (path === "/v1/betaTesters" && query.get("filter[betaGroups]") === "g-friends") return page([person("t1", "INSTALLED")], null, 1);
  if (path === "/v1/betaTesters" && query.get("filter[betaGroups]") === "g-team") return page([], null, 0);
  if (path === "/v1/apps/app-1/metrics/betaTesterUsages") return page([{ dataPoints: [
    { start: "2026-09-16", end: "2026-10-01", values: { sessionCount: 10, crashCount: 1, feedbackCount: 2 } },
    { start: "2026-10-01", end: "2026-10-15", values: { sessionCount: 5, crashCount: 0 } },
  ] }]);
  if (path === "/v1/builds") return {
    data: [
      { type: "builds", id: "b-41", attributes: { version: "41", uploadedDate: "2026-10-12T08:00:00Z", expirationDate: "2027-01-10T08:00:00Z", expired: false, processingState: "VALID" }, relationships: { preReleaseVersion: { data: { type: "preReleaseVersions", id: "pv-1" } } } },
      { type: "builds", id: "b-40", attributes: { version: "40", uploadedDate: "2026-10-01T08:00:00Z", expirationDate: "2026-12-30T08:00:00Z", expired: false, processingState: "VALID" }, relationships: { preReleaseVersion: { data: { type: "preReleaseVersions", id: "pv-1" } } } },
    ],
    included: [{ type: "preReleaseVersions", id: "pv-1", attributes: { version: "0.9.1" } }],
    links: {},
  };
  if (path === "/v1/builds/b-41/metrics/betaBuildUsages") return page([{ dataPoints: [{ values: { installCount: 3, sessionCount: 20, crashCount: 1, inviteCount: 9 } }] }]);
  if (path === "/v1/builds/b-40/metrics/betaBuildUsages") return page([{ dataPoints: [{ values: { installCount: 2, sessionCount: 7, crashCount: 0 } }, { values: { installCount: 1 } }] }]);
  return null;
}

const requests = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  requests.push({ url, authorization: new Headers(init.headers).get("authorization") });
  const body = url.origin === api ? appStoreConnect(url.pathname, url.searchParams) : null;
  return body ? Response.json(body) : Response.json({ errors: [{ status: "404" }] }, { status: 404 });
};

const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString());

test("the token is ES256 for the team key, for App Store Connect, for 20 minutes", async () => {
  const now = Date.UTC(2026, 9, 15, 6, 0, 0);
  for (const privatePem of [pem, pem.replaceAll("\n", "\\n"), pem.replace(/-----[^-]+-----/g, "")]) {
    const token = await ascToken({ ...key, ASC_PRIVATE_KEY: privatePem }, now);
    const [header, payload, signature] = token.split(".");
    assert.deepEqual(decode(header), { alg: "ES256", kid: "TESTKEY123", typ: "JWT" });
    assert.deepEqual(decode(payload), { iss: key.ASC_ISSUER_ID, iat: now / 1000, exp: now / 1000 + 1200, aud: "appstoreconnect-v1" });
    const valid = verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"));
    assert.equal(valid, true);
  }
});

test("lists follow next links, stop at 200, and the token only goes to Apple", async () => {
  const get = ascClient("token");
  const testers = await paginate(get, "/v1/betaTesters?filter[apps]=app-1&limit=200");
  assert.equal(testers.items.length, 5);
  assert.equal(testers.total, 5);
  assert.equal(requests.at(-1).url.searchParams.get("cursor"), "2");
  assert.equal(requests.at(-1).authorization, "Bearer token");

  let pages = 0;
  const endless = async () => {
    pages += 1;
    return { data: Array.from({ length: 50 }, (_, id) => ({ id: `${pages}-${id}` })), links: { next: `${api}/v1/next?page=${pages}` } };
  };
  assert.equal((await paginate(endless, "/v1/first")).items.length, 200);
  assert.equal(pages, 4);

  await assert.rejects(get("https://elsewhere.example/v1/apps"), /another host/);
});

test("a snapshot holds counts and build rows only, one row per day", async () => {
  const env = environment();
  const before = requests.length;
  const snapshot = await collectSnapshot(ascClient("token"), new Date("2026-10-15T06:00:00Z"));
  assert.deepEqual(
    { ...snapshot, builds: undefined },
    { takenAt: "2026-10-15T06:00:00.000Z", testersTotal: 5, testersPublicLink: 4, testersInstalled: 3, sessions30d: 15, crashes30d: 1, builds: undefined },
  );
  assert.deepEqual(snapshot.builds, [
    { build: "41", version: "0.9.1", uploaded: "2026-10-12T08:00:00Z", processingState: "VALID", expires: "2027-01-10T08:00:00Z", expired: false, installs: 3, sessions: 20, crashes: 1 },
    { build: "40", version: "0.9.1", uploaded: "2026-10-01T08:00:00Z", processingState: "VALID", expires: "2026-12-30T08:00:00Z", expired: false, installs: 3, sessions: 7, crashes: 0 },
  ]);
  const testerRequests = requests.slice(before).filter((request) => request.url.pathname === "/v1/betaTesters");
  assert.ok(testerRequests.every((request) => request.url.searchParams.get("fields[betaTesters]") === "state"));

  await storeSnapshot(env, snapshot);
  await storeSnapshot(env, { ...snapshot, takenAt: "2026-10-15T09:30:00.000Z", testersTotal: 6 });
  const rows = env.DB.sqlite.prepare("SELECT * FROM testflight_snapshots").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].testers_total, 6);
  const stored = JSON.stringify(rows);
  assert.doesNotMatch(stored, /Name t|Tester|@example\.com|"t[1-5]"|app-1|b-4[01]|pv-1|g-public/);
});

test("refreshing needs a session, a key, and waits 10 minutes between runs", async () => {
  const env = environment(key);
  const denied = await worker.fetch(new Request("https://admin.example.com/admin-api/testflight/refresh", { method: "POST" }), env);
  assert.equal(denied.status, 401);

  const before = requests.length;
  const missing = await worker.fetch(new Request("http://localhost/admin-api/testflight/refresh", { method: "POST" }), environment());
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: "key_missing" });
  assert.equal(requests.length, before);

  const first = await worker.fetch(new Request("http://localhost/admin-api/testflight/refresh", { method: "POST" }), env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).latest.testersTotal, 5);
  assert.ok(requests.slice(before).every((request) => request.url.origin === api && /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(request.authorization)));

  const again = await worker.fetch(new Request("http://localhost/admin-api/testflight/refresh", { method: "POST" }), env);
  assert.equal(again.status, 429);
  const body = await again.json();
  assert.equal(body.error, "rate_limited");
  assert.ok(body.retryAfter > 500 && body.retryAfter <= 600);
});

test("the dashboard API returns the latest snapshot and a 30-day trend", async () => {
  const env = environment();
  const denied = await worker.fetch(new Request("https://admin.example.com/admin-api/testflight"), env);
  assert.equal(denied.status, 401);

  const empty = await (await worker.fetch(new Request("http://localhost/admin-api/testflight"), env)).json();
  assert.deepEqual({ configured: empty.configured, latest: empty.latest }, { configured: false, latest: null });

  const dayAt = (offset) => new Date(Date.now() - offset * 86_400_000).toISOString();
  const snapshot = await collectSnapshot(ascClient("token"));
  await storeSnapshot(env, { ...snapshot, takenAt: dayAt(3), testersTotal: 2 });
  await storeSnapshot(env, { ...snapshot, takenAt: dayAt(40), testersTotal: 1 });
  await storeSnapshot(env, snapshot);

  const data = await (await worker.fetch(new Request("http://localhost/admin-api/testflight"), { ...env, ...key })).json();
  assert.equal(data.configured, true);
  assert.equal(data.latest.takenAt, snapshot.takenAt);
  assert.equal(data.latest.testersTotal, 5);
  assert.equal(data.latest.builds.length, 2);
  assert.equal(data.trend.length, 30);
  assert.deepEqual(data.trend.at(-1), { day: dayAt(0).slice(0, 10), testers: 5, installed: 3 });
  assert.equal(data.trend.at(-4).testers, 2);
  assert.equal(data.trend.filter((point) => point.testers !== null).length, 2);
});

test("the daily run does nothing without a key", async () => {
  const before = requests.length;
  const waits = [];
  await worker.scheduled({}, environment(), { waitUntil: (promise) => waits.push(promise) });
  await Promise.all(waits);
  assert.equal(requests.length, before);
});
