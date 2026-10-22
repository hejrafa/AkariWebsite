// Cloudflare usage against the free plan, read from the GraphQL Analytics API
// once a day (and on Refresh) for yesterday and today: yesterday's numbers are
// only complete the morning after. One row per UTC day, counts only.

export interface CloudflareEnv {
  DB: D1Database;
  CF_ANALYTICS_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_ZONE_ID?: string;
  CF_LIMIT_WORKER_REQUESTS?: string;
  CF_LIMIT_D1_ROWS_READ?: string;
  CF_LIMIT_D1_ROWS_WRITTEN?: string;
  CF_LIMIT_D1_STORAGE_BYTES?: string;
}

export interface CloudflareDay {
  day: string;
  workerRequests: number;
  workerErrors: number;
  d1RowsRead: number;
  d1RowsWritten: number;
  d1Bytes: number | null;
  pagesRequests: number | null;
}

interface CloudflareRow {
  day: string;
  taken_at: string;
  worker_requests: number | null;
  worker_errors: number | null;
  d1_rows_read: number | null;
  d1_rows_written: number | null;
  d1_bytes: number | null;
  pages_requests: number | null;
}

type Document = Record<string, any>;

const graphqlEndpoint = "https://api.cloudflare.com/client/v4/graphql";
const tagPattern = /^[0-9a-f]{32}$/u;
const refreshInterval = 15 * 60 * 1000;
const trendDays = 30;
// Workers Free and D1 Free, as developers.cloudflare.com/workers/platform/pricing
// listed them on this day; each can be changed with its CF_LIMIT_ variable.
export const limitsAsOf = "2026-10-22";
const defaultLimits = { workerRequests: 100_000, d1RowsRead: 5_000_000, d1RowsWritten: 100_000, d1StorageBytes: 5_000_000_000 };
// Covers refreshes that failed before a row was stored, within this isolate.
let lastAttemptAt = 0;

export function hasCloudflareToken(env: CloudflareEnv): boolean {
  return Boolean(env.CF_ANALYTICS_TOKEN && env.CF_ACCOUNT_ID && tagPattern.test(env.CF_ACCOUNT_ID.trim()));
}

export function cloudflareLimits(env: CloudflareEnv) {
  const limit = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return value?.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    workerRequests: limit(env.CF_LIMIT_WORKER_REQUESTS, defaultLimits.workerRequests),
    d1RowsRead: limit(env.CF_LIMIT_D1_ROWS_READ, defaultLimits.d1RowsRead),
    d1RowsWritten: limit(env.CF_LIMIT_D1_ROWS_WRITTEN, defaultLimits.d1RowsWritten),
    d1StorageBytes: limit(env.CF_LIMIT_D1_STORAGE_BYTES, defaultLimits.d1StorageBytes),
  };
}

/// One query for the given UTC days: Workers requests and errors summed over every
/// script in the account (one alias per day), D1 rows read and written over every
/// database, each database's largest size per day, and the zone's requests when a
/// zone is set. The ids are checked hex and the days are ours, so they are inlined.
export function cloudflareQuery(account: string, zone: string | null, days: string[]): string {
  const since = JSON.stringify(days[0]);
  const until = JSON.stringify(days[days.length - 1]);
  const workers = days.map((day, index) => `
      workers${index}: workersInvocationsAdaptive(limit: 1, filter: { datetime_geq: ${JSON.stringify(`${day}T00:00:00Z`)}, datetime_leq: ${JSON.stringify(`${day}T23:59:59Z`)} }) {
        sum { requests errors }
      }`).join("");
  const pages = zone ? `
    zones(filter: { zoneTag: ${JSON.stringify(zone)} }) {
      httpRequests1dGroups(limit: ${days.length}, filter: { date_geq: ${since}, date_leq: ${until} }) {
        sum { requests }
        dimensions { date }
      }
    }` : "";
  return `{
  viewer {
    accounts(filter: { accountTag: ${JSON.stringify(account)} }) {${workers}
      d1AnalyticsAdaptiveGroups(limit: 100, filter: { date_geq: ${since}, date_leq: ${until} }) {
        sum { rowsRead rowsWritten }
        dimensions { date }
      }
      d1StorageAdaptiveGroups(limit: 1000, filter: { date_geq: ${since}, date_leq: ${until} }) {
        max { databaseSizeBytes }
        dimensions { date databaseId }
      }
    }${pages}
  }
}`;
}

const number = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const list = (value: unknown): Document[] => (Array.isArray(value) ? value : []);

/// The answer as one row per asked day. A day with no events has no group, so its
/// counts are 0; storage stays unknown without a size, the website without a zone.
export function parseCloudflare(body: Document, days: string[], withZone: boolean): CloudflareDay[] {
  const errors = list(body?.errors);
  if (errors.length) throw new Error(`Cloudflare answered: ${String(errors[0]?.message ?? "an error").slice(0, 300)}`);
  const account = list(body?.data?.viewer?.accounts)[0];
  if (!account) throw new Error("Cloudflare answered without the account");
  const zone = list(body?.data?.viewer?.zones)[0];

  return days.map((day, index) => {
    const workers = list(account[`workers${index}`]);
    const d1 = list(account.d1AnalyticsAdaptiveGroups).filter((group) => group?.dimensions?.date === day);
    const storage = list(account.d1StorageAdaptiveGroups).filter((group) => group?.dimensions?.date === day);
    const pages = list(zone?.httpRequests1dGroups).filter((group) => group?.dimensions?.date === day);
    return {
      day,
      workerRequests: workers.reduce((sum, group) => sum + number(group?.sum?.requests), 0),
      workerErrors: workers.reduce((sum, group) => sum + number(group?.sum?.errors), 0),
      d1RowsRead: d1.reduce((sum, group) => sum + number(group?.sum?.rowsRead), 0),
      d1RowsWritten: d1.reduce((sum, group) => sum + number(group?.sum?.rowsWritten), 0),
      d1Bytes: storage.length ? storage.reduce((sum, group) => sum + number(group?.max?.databaseSizeBytes), 0) : null,
      pagesRequests: withZone && zone ? pages.reduce((sum, group) => sum + number(group?.sum?.requests), 0) : null,
    };
  });
}

export async function collectCloudflare(env: CloudflareEnv, now = new Date()): Promise<CloudflareDay[]> {
  const days = [new Date(now.getTime() - 86_400_000), now].map((date) => date.toISOString().slice(0, 10));
  const account = (env.CF_ACCOUNT_ID ?? "").trim();
  const zone = env.CF_ZONE_ID?.trim() && tagPattern.test(env.CF_ZONE_ID.trim()) ? env.CF_ZONE_ID.trim() : null;
  const response = await fetch(graphqlEndpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query: cloudflareQuery(account, zone, days) }),
  });
  if (!response.ok) throw new Error(`Cloudflare answered ${response.status} for the GraphQL Analytics API`);
  return parseCloudflare(await response.json<Document>(), days, zone !== null);
}

export async function storeCloudflare(env: CloudflareEnv, days: CloudflareDay[], takenAt: string): Promise<void> {
  await env.DB.batch(days.map((day) => env.DB.prepare(`
    INSERT OR REPLACE INTO cloudflare_days (
      day, taken_at, worker_requests, worker_errors, d1_rows_read, d1_rows_written, d1_bytes, pages_requests
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(day.day, takenAt, day.workerRequests, day.workerErrors, day.d1RowsRead, day.d1RowsWritten, day.d1Bytes, day.pagesRequests)));
}

export type RefreshResult = { status: "ok" } | { status: "token_missing" } | { status: "rate_limited"; retryAfter: number };

/// Fetches and stores yesterday's and today's rows. The daily cron skips the wait.
export async function refreshCloudflare(env: CloudflareEnv, { limited = false } = {}): Promise<RefreshResult> {
  if (!hasCloudflareToken(env)) return { status: "token_missing" };
  if (limited) {
    const latest = await env.DB.prepare("SELECT MAX(taken_at) AS taken_at FROM cloudflare_days")
      .first<{ taken_at: string | null }>();
    const last = Math.max(lastAttemptAt, latest?.taken_at ? Date.parse(latest.taken_at) : 0);
    const wait = last + refreshInterval - Date.now();
    if (wait > 0) return { status: "rate_limited", retryAfter: Math.ceil(wait / 1000) };
  }
  lastAttemptAt = Date.now();
  const now = new Date();
  await storeCloudflare(env, await collectCloudflare(env, now), now.toISOString());
  return { status: "ok" };
}

export async function readCloudflare(env: CloudflareEnv) {
  const dayAt = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
  const [latest, recent] = await Promise.all([
    env.DB.prepare("SELECT * FROM cloudflare_days ORDER BY day DESC LIMIT 1").first<CloudflareRow>(),
    env.DB.prepare("SELECT day, worker_requests, worker_errors FROM cloudflare_days WHERE day >= ?")
      .bind(dayAt(trendDays - 1)).all<Pick<CloudflareRow, "day" | "worker_requests" | "worker_errors">>()
      .then((result) => result.results ?? []),
  ]);
  const byDay = new Map(recent.map((row) => [row.day, row]));
  return {
    configured: hasCloudflareToken(env),
    limits: cloudflareLimits(env),
    limitsAsOf,
    latest: latest ? {
      day: latest.day,
      takenAt: latest.taken_at,
      workerRequests: latest.worker_requests,
      workerErrors: latest.worker_errors,
      d1RowsRead: latest.d1_rows_read,
      d1RowsWritten: latest.d1_rows_written,
      d1Bytes: latest.d1_bytes,
      pagesRequests: latest.pages_requests,
    } : null,
    trend: Array.from({ length: trendDays }, (_, index) => {
      const day = dayAt(trendDays - 1 - index);
      const row = byDay.get(day);
      return { day, requests: row?.worker_requests ?? null, errors: row?.worker_errors ?? null };
    }),
  };
}
