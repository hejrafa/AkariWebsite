import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import test from "node:test";
import worker from "../src/index.ts";

const ownerEmail = "owner@example.com";
const ownerPassword = "owner-test-password";
const salt = Buffer.from("d1ccfbf2fbda45e997b3292fe439f120", "hex");
const statements = [];
const env = {
  ADMIN_HOST: "admin.example.com",
  API_HOST: "api.example.com",
  ADMIN_EMAIL: ownerEmail,
  ADMIN_PASSWORD_HASH: `pbkdf2-sha256:100000:${salt.toString("hex")}:${pbkdf2Sync(ownerPassword, salt, 100_000, 32, "sha256").toString("hex")}`,
  SESSION_SECRET: "test-only-signing-secret",
  ASSETS: { fetch: async () => new Response("dashboard") },
  DB: {
    prepare: (sql) => ({
      bind: (...values) => ({
        run: async () => {
          statements.push({ sql, values });
          return { meta: { changes: 1 } };
        },
        first: async () => ({ count: 0 }),
      }),
    }),
  },
};

function request(path, options = {}) {
  return worker.fetch(new Request(`https://admin.example.com${path}`, options), env);
}

test("resolving a report without an admin note keeps the stored note", async () => {
  const login = await request("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: ownerEmail, password: ownerPassword }) });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const response = await request("/admin-api/reports/report-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ status: "fixed" }) });
  assert.equal(response.status, 200);
  assert.equal(statements.length, 1);
  assert.doesNotMatch(statements[0].sql, /admin_note/);
  assert.equal(statements[0].values[0], "fixed");
  assert.equal(statements[0].values.at(-1), "report-1");
});

test("a report for a meal with no matched food is stored only when it says what was typed", async () => {
  const report = (values) => worker.fetch(new Request("https://api.example.com/v1/food-feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rating: "negative", reasons: ["missing_product"], flow: "meal_review", installationId: "installation-0000000001", items: [], ...values }),
  }), env);

  const accepted = await report({ logText: "Grandma’s plum dumplings", unmatched: ["Grandma’s plum dumplings"] });
  assert.equal(accepted.status, 201);
  const insert = statements.at(-1);
  assert.match(insert.sql, /INSERT INTO food_feedback/);
  assert.ok(insert.values.includes(JSON.stringify(["Grandma’s plum dumplings"])));

  const empty = await report({});
  assert.equal(empty.status, 400);

  // A scanned code no database knew is a report on its own.
  const barcode = await report({ flow: "barcode", reasons: ["barcode_or_scan", "missing_product"], barcode: "4000000000016" });
  assert.equal(barcode.status, 201);
  assert.ok(statements.at(-1).values.includes("4000000000016"));
  const letters = await report({ flow: "barcode", reasons: ["barcode_or_scan"], barcode: "not-a-code" });
  assert.equal(letters.status, 400);
});
