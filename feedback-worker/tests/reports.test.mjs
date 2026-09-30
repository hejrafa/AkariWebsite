import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import worker from "../src/index.ts";

const ownerEmail = "owner@example.com";
const ownerPassword = "owner-test-password";
const statements = [];
const env = {
  ADMIN_HOST: "admin.example.com",
  API_HOST: "api.example.com",
  ADMIN_EMAIL: ownerEmail,
  ADMIN_PASSWORD_HASH: createHash("sha256").update(ownerPassword).digest("hex"),
  SESSION_SECRET: "test-only-signing-secret",
  ASSETS: { fetch: async () => new Response("dashboard") },
  DB: {
    prepare: (sql) => ({
      bind: (...values) => ({
        run: async () => {
          statements.push({ sql, values });
          return { meta: { changes: 1 } };
        },
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
