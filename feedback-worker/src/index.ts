interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_HOST: string;
  API_HOST: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
}

type FeedbackRating = "positive" | "negative";
type FeedbackStatus = "new" | "reviewing" | "fixed" | "dismissed";

interface FoodFeedbackItem {
  productId: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  source: string;
  query?: string | null;
  amount?: number;
  unit?: string | null;
  nutritionBasis?: string | null;
  nutrients: Record<string, number>;
  estimatedNutrients: string[];
}

interface FoodFeedbackPayload {
  rating: FeedbackRating;
  reasons?: string[];
  note?: string;
  logText?: string;
  flow: string;
  locale?: string;
  market?: string;
  appVersion?: string;
  buildNumber?: string;
  catalogVersion?: string;
  installationId: string;
  items: FoodFeedbackItem[];
}

interface FeedbackRow {
  id: string;
  created_at: string;
  updated_at: string;
  rating: FeedbackRating;
  reasons_json: string;
  note: string | null;
  log_text: string | null;
  flow: string;
  locale: string | null;
  market: string | null;
  app_version: string | null;
  build_number: string | null;
  catalog_version: string | null;
  items_json: string;
  status: FeedbackStatus;
  admin_note: string | null;
}

const allowedReasons = new Set([
  "wrong_match",
  "wrong_icon",
  "nutrition",
  "serving",
  "barcode_or_scan",
  "missing_product",
  "extra_product",
  "too_slow",
  "other",
]);
const allowedStatuses = new Set<FeedbackStatus>([
  "new",
  "reviewing",
  "fixed",
  "dismissed",
]);
const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const isAdminHost = env.ADMIN_HOST.length > 0 && host === env.ADMIN_HOST.toLowerCase();
    const isConfiguredAPIHost = env.API_HOST.length > 0 && host === env.API_HOST.toLowerCase();
    const isWorkersDev = host.endsWith(".workers.dev");
    const isLocal = host === "127.0.0.1" || host === "localhost";

    if (request.method === "POST" && url.pathname === "/v1/food-feedback") {
      if (!isConfiguredAPIHost && !isWorkersDev && !isLocal) return notFound();
      return createFeedback(request, env);
    }

    if (url.pathname.startsWith("/auth/")) {
      if (!isAdminHost && !isWorkersDev && !isLocal) return notFound();
      if (request.method === "POST" && url.pathname === "/auth/login") {
        return login(request, env, isLocal);
      }
      if (request.method === "POST" && url.pathname === "/auth/logout") {
        return logout();
      }
      if (request.method === "GET" && url.pathname === "/auth/session") {
        return json({ authenticated: await hasAdminSession(request, env, isLocal) });
      }
      return notFound();
    }

    if (url.pathname.startsWith("/admin-api/")) {
      if (!isAdminHost && !isWorkersDev && !isLocal) return notFound();
      if (!(await hasAdminSession(request, env, isLocal))) return unauthorized();
      if (request.method === "GET" && url.pathname === "/admin-api/reports") {
        return listReports(url, env);
      }
      const match = url.pathname.match(/^\/admin-api\/reports\/([^/]+)$/);
      if (request.method === "PATCH" && match) {
        return updateReport(request, env, decodeURIComponent(match[1]));
      }
      return notFound();
    }

    if (request.method === "GET" && (
      url.pathname === "/" ||
      url.pathname === "/login" ||
      url.pathname === "/login.html" ||
      url.pathname.startsWith("/assets/")
    )) {
      if (!isAdminHost && !isWorkersDev && !isLocal) return notFound();
      if (url.pathname.startsWith("/assets/")) return env.ASSETS.fetch(request);
      const authenticated = await hasAdminSession(request, env, isLocal);
      if (url.pathname === "/login" || url.pathname === "/login.html") {
        if (authenticated) return redirect("/");
        return env.ASSETS.fetch(request);
      }
      if (!authenticated) return redirect("/login");
      return env.ASSETS.fetch(request);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    return notFound();
  },
};

const sessionCookieName = "akari_admin_session";
const sessionLifetimeSeconds = 8 * 60 * 60;

async function login(request: Request, env: Env, isLocal: boolean): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_credentials" }, 401);
  }
  if (!isRecord(input) || typeof input.email !== "string" || typeof input.password !== "string") {
    return json({ error: "invalid_credentials" }, 401);
  }

  const email = clean(input.email, 320).toLowerCase();
  if (!isLocal) {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
      return json({ error: "authentication_not_configured" }, 503);
    }
    const suppliedHash = await sha256(input.password);
    if (email !== env.ADMIN_EMAIL.toLowerCase() || !constantTimeEqual(suppliedHash, env.ADMIN_PASSWORD_HASH)) {
      return json({ error: "invalid_credentials" }, 401);
    }
  }

  const token = await createSessionToken(email || "local@akari", env.SESSION_SECRET || "local-preview");
  return json(
    { ok: true },
    200,
    { "set-cookie": `${sessionCookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionLifetimeSeconds}` },
  );
}

function logout(): Response {
  return json(
    { ok: true },
    200,
    { "set-cookie": `${sessionCookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` },
  );
}

async function createSessionToken(email: string, secret: string): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify({
    email,
    expiresAt: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds,
  }));
  return `${payload}.${await sign(payload, secret)}`;
}

async function hasAdminSession(request: Request, env: Env, isLocal: boolean): Promise<boolean> {
  if (isLocal || request.headers.has("cf-access-authenticated-user-email")) return true;
  if (!env.SESSION_SECRET) return false;
  const token = readCookie(request, sessionCookieName);
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  if (!constantTimeEqual(signature, await sign(payload, env.SESSION_SECRET))) return false;
  try {
    const session = JSON.parse(base64UrlDecode(payload)) as { email?: unknown; expiresAt?: unknown };
    return typeof session.email === "string" &&
      session.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function sign(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function base64UrlEncode(value: string): string {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function createFeedback(request: Request, env: Env): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 64_000) return json({ error: "payload_too_large" }, 413);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const payload = validatePayload(input);
  if (!payload) return json({ error: "invalid_feedback" }, 400);

  const installationHash = await sha256(payload.installationId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM food_feedback WHERE installation_hash = ? AND created_at >= ?"
  ).bind(installationHash, since).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 50) return json({ error: "rate_limited" }, 429);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO food_feedback (
      id, created_at, updated_at, rating, reasons_json, note, log_text, flow,
      locale, market, app_version, build_number, catalog_version,
      installation_hash, items_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `).bind(
    id,
    now,
    now,
    payload.rating,
    JSON.stringify(payload.reasons ?? []),
    cleanOptional(payload.note, 500),
    cleanOptional(payload.logText, 2_000),
    clean(payload.flow, 40),
    cleanOptional(payload.locale, 40),
    cleanOptional(payload.market, 40),
    cleanOptional(payload.appVersion, 30),
    cleanOptional(payload.buildNumber, 30),
    cleanOptional(payload.catalogVersion, 80),
    installationHash,
    JSON.stringify(payload.items),
  ).run();

  return json({ id, received: true }, 201);
}

async function listReports(url: URL, env: Env): Promise<Response> {
  const status = url.searchParams.get("status");
  const rating = url.searchParams.get("rating");
  const search = cleanOptional(url.searchParams.get("search") ?? undefined, 100);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 250);
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (status && allowedStatuses.has(status as FeedbackStatus)) {
    conditions.push("status = ?");
    bindings.push(status);
  }
  if (rating === "positive" || rating === "negative") {
    conditions.push("rating = ?");
    bindings.push(rating);
  }
  if (search) {
    conditions.push("(items_json LIKE ? OR note LIKE ? OR reasons_json LIKE ?)");
    const pattern = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    bindings.push(pattern, pattern, pattern);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await env.DB.prepare(`
    SELECT id, created_at, updated_at, rating, reasons_json, note, flow,
           log_text, locale, market, app_version, build_number, catalog_version,
           items_json, status, admin_note
    FROM food_feedback
    ${where}
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(...bindings, limit).all<FeedbackRow>();

  return json({ reports: (result.results ?? []).map(presentRow) });
}

async function updateReport(request: Request, env: Env, id: string): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!isRecord(input)) return json({ error: "invalid_update" }, 400);
  const status = input.status;
  const adminNote = cleanOptional(typeof input.adminNote === "string" ? input.adminNote : undefined, 1_000);
  if (typeof status !== "string" || !allowedStatuses.has(status as FeedbackStatus)) {
    return json({ error: "invalid_status" }, 400);
  }

  const result = await env.DB.prepare(`
    UPDATE food_feedback
    SET status = ?, admin_note = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, adminNote, new Date().toISOString(), id).run();
  if (result.meta.changes === 0) return notFound();
  return json({ updated: true });
}

function validatePayload(input: unknown): FoodFeedbackPayload | null {
  if (!isRecord(input)) return null;
  if (input.rating !== "positive" && input.rating !== "negative") return null;
  if (typeof input.flow !== "string" || input.flow.length === 0 || input.flow.length > 40) return null;
  if (typeof input.installationId !== "string" || input.installationId.length < 16 || input.installationId.length > 100) return null;
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 20) return null;
  if (input.reasons !== undefined && (!Array.isArray(input.reasons)
      || input.reasons.length > 8
      || input.reasons.some((reason) => typeof reason !== "string" || !allowedReasons.has(reason)))) {
    return null;
  }
  if (input.rating === "negative" && (!Array.isArray(input.reasons) || input.reasons.length === 0)) return null;
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 500)) return null;
  if (input.logText !== undefined && (typeof input.logText !== "string" || input.logText.length > 2_000)) return null;

  const items: FoodFeedbackItem[] = [];
  for (const value of input.items) {
    if (!isRecord(value)
        || typeof value.productId !== "string" || value.productId.length === 0 || value.productId.length > 160
        || typeof value.name !== "string" || value.name.length === 0 || value.name.length > 200
        || typeof value.source !== "string" || value.source.length === 0 || value.source.length > 40
        || !isRecord(value.nutrients)
        || !Array.isArray(value.estimatedNutrients)) return null;
    const nutrients: Record<string, number> = {};
    for (const [key, raw] of Object.entries(value.nutrients)) {
      if (key.length > 80 || typeof raw !== "number" || !Number.isFinite(raw)) return null;
      nutrients[key] = raw;
    }
    if (Object.keys(nutrients).length > 80) return null;
    const estimatedNutrients = value.estimatedNutrients.filter(
      (item): item is string => typeof item === "string" && item.length <= 80
    ).slice(0, 80);
    items.push({
      productId: clean(value.productId, 160),
      barcode: cleanOptional(typeof value.barcode === "string" ? value.barcode : undefined, 32),
      name: clean(value.name, 200),
      brand: cleanOptional(typeof value.brand === "string" ? value.brand : undefined, 120),
      source: clean(value.source, 40),
      query: cleanOptional(typeof value.query === "string" ? value.query : undefined, 200),
      amount: finiteOptional(value.amount),
      unit: cleanOptional(typeof value.unit === "string" ? value.unit : undefined, 40),
      nutritionBasis: cleanOptional(typeof value.nutritionBasis === "string" ? value.nutritionBasis : undefined, 40),
      nutrients,
      estimatedNutrients,
    });
  }

  return {
    rating: input.rating,
    reasons: input.reasons as string[] | undefined,
    note: typeof input.note === "string" ? input.note : undefined,
    logText: typeof input.logText === "string" ? input.logText : undefined,
    flow: input.flow,
    locale: typeof input.locale === "string" ? input.locale : undefined,
    market: typeof input.market === "string" ? input.market : undefined,
    appVersion: typeof input.appVersion === "string" ? input.appVersion : undefined,
    buildNumber: typeof input.buildNumber === "string" ? input.buildNumber : undefined,
    catalogVersion: typeof input.catalogVersion === "string" ? input.catalogVersion : undefined,
    installationId: input.installationId,
    items,
  };
}

function presentRow(row: FeedbackRow) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rating: row.rating,
    reasons: parseArray(row.reasons_json),
    note: row.note,
    logText: row.log_text,
    flow: row.flow,
    locale: row.locale,
    market: row.market,
    appVersion: row.app_version,
    buildNumber: row.build_number,
    catalogVersion: row.catalog_version,
    items: parseArray(row.items_json),
    status: row.status,
    adminNote: row.admin_note,
  };
}

function parseArray(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value: string, maximum: number): string {
  return value.trim().slice(0, maximum);
}

function cleanOptional(value: string | undefined, maximum: number): string | null {
  if (value === undefined) return null;
  const cleaned = clean(value, maximum);
  return cleaned.length ? cleaned : null;
}

function finiteOptional(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(value: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...jsonHeaders, ...headers },
  });
}

function redirect(path: string): Response {
  return new Response(null, { status: 302, headers: { location: path, "cache-control": "no-store" } });
}

function unauthorized(): Response {
  return json({ error: "admin_access_required" }, 401);
}

function notFound(): Response {
  return json({ error: "not_found" }, 404);
}
