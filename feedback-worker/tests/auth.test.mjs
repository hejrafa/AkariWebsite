import assert from "node:assert/strict";
import { createHash, createHmac, pbkdf2Sync } from "node:crypto";
import test from "node:test";
import worker from "../src/index.ts";

const ownerEmail = "owner@example.com";
const teammateEmail = "teammate@example.com";
const ownerPassword = "owner-test-password";
const teammatePassword = "teammate-test-password";
const salt = Buffer.from("d1ccfbf2fbda45e997b3292fe439f120", "hex");
const passwordHash = `pbkdf2-sha256:100000:${salt.toString("hex")}:${pbkdf2Sync(teammatePassword, salt, 100_000, 32, "sha256").toString("hex")}`;
const env = {
  ADMIN_HOST: "admin.example.com",
  API_HOST: "api.example.com",
  ADMIN_EMAIL: ownerEmail,
  ADMIN_PASSWORD_HASH: createHash("sha256").update(ownerPassword).digest("hex"),
  SESSION_SECRET: "test-only-signing-secret",
  ADDITIONAL_ADMINS: JSON.stringify([{ email: teammateEmail, passwordHash }]),
  ASSETS: { fetch: async () => new Response("dashboard") },
};

function request(path, options = {}, config = env) {
  return worker.fetch(new Request(`https://admin.example.com${path}`, options), config);
}

function login(email, password, config = env) {
  return request("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }, config);
}

function cookie(response) {
  return response.headers.get("set-cookie").split(";")[0];
}

async function authenticated(value, config = env) {
  const response = await request("/auth/session", { headers: { cookie: value } }, config);
  return (await response.json()).authenticated;
}

function signedCookie(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.SESSION_SECRET).update(encoded).digest("base64url");
  return `akari_admin_session=${encoded}.${signature}`;
}

test("owner and teammate have independent working logins and protected dashboard access", async () => {
  for (const [email, password] of [[ownerEmail, ownerPassword], [teammateEmail, teammatePassword]]) {
    const response = await login(` ${email.toUpperCase()} `, password);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Strict/);
    assert.equal(await authenticated(cookie(response)), true);
    const dashboard = await request("/", { headers: { cookie: cookie(response) } });
    assert.equal(await dashboard.text(), "dashboard");
  }
});

test("wrong passwords, crossed credentials, unknown accounts, and oversized passwords are denied", async () => {
  for (const [email, password] of [[teammateEmail, "wrong"], [ownerEmail, teammatePassword], [teammateEmail, ownerPassword], ["stranger@example.com", teammatePassword], [teammateEmail, "a".repeat(1025)]]) {
    const response = await login(email, password);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("removing an account or rotating its password invalidates its sessions", async () => {
  const value = cookie(await login(teammateEmail, teammatePassword));
  assert.equal(await authenticated(value, { ...env, ADDITIONAL_ADMINS: "[]" }), false);
  const replacementHash = passwordHash.slice(0, -1) + (passwordHash.endsWith("0") ? "1" : "0");
  assert.equal(await authenticated(value, { ...env, ADDITIONAL_ADMINS: JSON.stringify([{ email: teammateEmail, passwordHash: replacementHash }]) }), false);
  assert.equal(await authenticated(value), true);
});

test("expired, tampered, or malformed sessions are denied", async () => {
  const value = cookie(await login(teammateEmail, teammatePassword));
  assert.equal(await authenticated(value + "x"), false);
  assert.equal(await authenticated("akari_admin_session=invalid"), false);
  assert.equal(await authenticated(signedCookie({ email: teammateEmail, expiresAt: 1 })), false);
  assert.equal(await authenticated(signedCookie(null)), false);
  assert.equal(await authenticated(value, { ...env, SESSION_SECRET: "" }), false);
});

test("legacy owner sessions remain valid, but teammates require a credential version", async () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  assert.equal(await authenticated(signedCookie({ email: ownerEmail, expiresAt })), true);
  assert.equal(await authenticated(signedCookie({ email: teammateEmail, expiresAt })), false);
});

test("an identity header alone cannot access admin pages or reports", async () => {
  const headers = { "cf-access-authenticated-user-email": ownerEmail };
  assert.equal((await request("/", { headers })).status, 302);
  assert.equal((await request("/admin-api/reports", { headers })).status, 401);
  assert.deepEqual(await (await request("/auth/session", { headers })).json(), { authenticated: false });
});

test("invalid additional account configuration fails closed while preserving owner login", async () => {
  for (const value of ["not json", "null", "{}", "[null]", JSON.stringify([{ email: teammateEmail, passwordHash: env.ADMIN_PASSWORD_HASH }])]) {
    const config = { ...env, ADDITIONAL_ADMINS: value };
    assert.equal((await login(ownerEmail, ownerPassword, config)).status, 200);
    assert.equal((await login(teammateEmail, teammatePassword, config)).status, 401);
  }
});

test("additional accounts cannot override the owner's password", async () => {
  const config = { ...env, ADDITIONAL_ADMINS: JSON.stringify([{ email: ownerEmail, passwordHash }]) };
  assert.equal((await login(ownerEmail, ownerPassword, config)).status, 200);
  assert.equal((await login(ownerEmail, teammatePassword, config)).status, 401);
});

test("logout clears the browser session and API host cannot serve admin routes", async () => {
  const logout = await request("/auth/logout", { method: "POST" });
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  const response = await worker.fetch(new Request("https://api.example.com/auth/session"), env);
  assert.equal(response.status, 404);
});

test("missing signing configuration fails closed", async () => {
  assert.equal((await login(teammateEmail, teammatePassword, { ...env, SESSION_SECRET: "" })).status, 503);
});
