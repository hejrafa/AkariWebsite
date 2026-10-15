// TestFlight numbers for the dashboard, read from the App Store Connect API
// once a day (and on Refresh). Only counts leave this file: tester names,
// emails and ids are never requested, stored or logged.

export interface TestFlightEnv {
  DB: D1Database;
  ASC_KEY_ID?: string;
  ASC_ISSUER_ID?: string;
  ASC_PRIVATE_KEY?: string;
}

export interface TestFlightBuild {
  build: string;
  version: string | null;
  uploaded: string | null;
  processingState: string | null;
  expires: string | null;
  expired: boolean;
  installs: number;
  sessions: number;
  crashes: number;
}

export interface TestFlightSnapshot {
  takenAt: string;
  testersTotal: number;
  testersPublicLink: number;
  testersInstalled: number;
  sessions30d: number;
  crashes30d: number;
  builds: TestFlightBuild[];
}

interface SnapshotRow {
  day: string;
  taken_at: string;
  testers_total: number;
  testers_public_link: number;
  testers_installed: number;
  sessions_30d: number;
  crashes_30d: number;
  builds_json: string;
}

type Document = Record<string, any>;
type Get = (target: string) => Promise<Document>;

const apiOrigin = "https://api.appstoreconnect.apple.com";
const bundleId = "com.hejrafa.SacredHeart";
const listCap = 200;
const buildCount = 10;
const tokenLifetimeSeconds = 20 * 60;
const refreshInterval = 10 * 60 * 1000;
const trendDays = 30;
// Covers refreshes that failed before a snapshot was stored, within this isolate.
let lastAttemptAt = 0;

export function hasTestFlightKey(env: TestFlightEnv): boolean {
  return Boolean(env.ASC_KEY_ID && env.ASC_ISSUER_ID && env.ASC_PRIVATE_KEY);
}

/// An ES256 token for a team key, valid for 20 minutes (Apple's limit).
export async function ascToken(env: TestFlightEnv, now = Date.now()): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  const header = { alg: "ES256", kid: env.ASC_KEY_ID, typ: "JWT" };
  const payload = { iss: env.ASC_ISSUER_ID, iat: issuedAt, exp: issuedAt + tokenLifetimeSeconds, aud: "appstoreconnect-v1" };
  const encoder = new TextEncoder();
  const input = `${base64Url(encoder.encode(JSON.stringify(header)))}.${base64Url(encoder.encode(JSON.stringify(payload)))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(env.ASC_PRIVATE_KEY ?? ""),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  // WebCrypto signs ECDSA as raw r‖s, which is the form JWS expects.
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(input));
  return `${input}.${base64Url(new Uint8Array(signature))}`;
}

/// Accepts the .p8 file as pasted, with or without its BEGIN/END lines, and
/// with real or escaped line breaks.
function pemBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----(BEGIN|END) [A-Z ]+-----/gu, "")
    .replaceAll("\\n", "")
    .replace(/\s+/gu, "");
  return Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function ascClient(token: string): Get {
  return async (target) => {
    const url = new URL(target, apiOrigin);
    // `next` links come from the response; the token only ever goes to Apple.
    if (url.origin !== apiOrigin) throw new Error("App Store Connect sent a link to another host");
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
    if (!response.ok) {
      const reason = await errorReason(response);
      throw new Error(`App Store Connect answered ${response.status} for ${url.pathname}${reason ? `: ${reason}` : ""}`);
    }
    return response.json<Document>();
  };
}

/// Apple's own words for a failed request: the first error's code and detail.
async function errorReason(response: Response): Promise<string> {
  try {
    const body: Document = await response.json();
    const error = Array.isArray(body.errors) ? body.errors[0] : null;
    if (!error) return "";
    return [error.code, error.detail ?? error.title].filter((part) => typeof part === "string").join(" ").slice(0, 300);
  } catch {
    return "";
  }
}

/// Follows `links.next` until the list ends or holds `cap` items.
export async function paginate(get: Get, path: string, cap = listCap): Promise<{ items: Document[]; total: number | null }> {
  const items: Document[] = [];
  let total: number | null = null;
  let next: string | undefined = path;
  while (next && items.length < cap) {
    const page = await get(next);
    const data: Document[] = Array.isArray(page.data) ? page.data : [];
    items.push(...data);
    if (total === null && typeof page.meta?.paging?.total === "number") total = page.meta.paging.total;
    const link = page.links?.next;
    next = data.length && typeof link === "string" && link !== next ? withQueryOf(path, link) : undefined;
  }
  return { items: items.slice(0, cap), total };
}

/// Apple's metric `next` links can drop parameters the endpoint requires
/// (such as `groupBy`), so the first request's ones are carried over.
function withQueryOf(first: string, link: string): string {
  const original = new URL(first, apiOrigin);
  const url = new URL(link, apiOrigin);
  original.searchParams.forEach((value, name) => {
    if (!url.searchParams.has(name)) url.searchParams.set(name, value);
  });
  return url.href;
}

/// Testers matching a filter (up to 200), asking only for their state. The
/// ids only exist here, to count someone in several groups once.
async function listTesters(get: Get, filter: string): Promise<Map<string, unknown>> {
  const { items } = await paginate(get, `/v1/betaTesters?${filter}&fields[betaTesters]=state&limit=${listCap}`);
  return new Map(items.map((tester) => [String(tester.id), tester.attributes?.state]));
}

function sumValues(series: Document[], ...names: string[]): Record<string, number> {
  const sums: Record<string, number> = Object.fromEntries(names.map((name) => [name, 0]));
  for (const entry of series) {
    for (const point of Array.isArray(entry.dataPoints) ? entry.dataPoints : []) {
      for (const name of names) {
        const value = point?.values?.[name];
        if (typeof value === "number" && Number.isFinite(value)) sums[name] += value;
      }
    }
  }
  return sums;
}

export async function collectSnapshot(get: Get, now = new Date()): Promise<TestFlightSnapshot> {
  const apps = await get(`/v1/apps?filter[bundleId]=${bundleId}&fields[apps]=bundleId&limit=${listCap}`);
  const app = (Array.isArray(apps.data) ? apps.data : []).find((candidate: Document) => candidate.attributes?.bundleId === bundleId);
  if (!app) throw new Error(`App Store Connect has no app with bundle id ${bundleId}`);
  const appId = encodeURIComponent(app.id);

  const [groups, testers, usage, builds] = await Promise.all([
    paginate(get, `/v1/apps/${appId}/betaGroups?fields[betaGroups]=name,isInternalGroup,publicLinkEnabled&limit=${listCap}`),
    listTesters(get, `filter[apps]=${appId}`),
    // Apple only answers per tester; the rows are summed, and the testers they
    // name (and any included tester details) are never read.
    paginate(get, `/v1/apps/${appId}/metrics/betaTesterUsages?period=P30D&groupBy=betaTesters&limit=${listCap}`),
    get(`/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=${buildCount}&include=preReleaseVersion` +
      `&fields[builds]=version,uploadedDate,expirationDate,expired,processingState,preReleaseVersion&fields[preReleaseVersions]=version`),
  ]);

  // Each group is read on its own; everyone is counted once, whether they are
  // in several groups or only have a build shared with them directly.
  const groupTesters = await Promise.all(groups.items.map(async (group) => ({
    publicLink: group.attributes?.publicLinkEnabled === true,
    testers: await listTesters(get, `filter[betaGroups]=${encodeURIComponent(group.id)}`),
  })));
  const everyone = new Map(testers);
  const publicLink = new Set<string>();
  for (const group of groupTesters) {
    for (const [id, state] of group.testers) {
      everyone.set(id, state);
      if (group.publicLink) publicLink.add(id);
    }
  }
  const usageSums = sumValues(usage.items, "sessionCount", "crashCount");

  const versions = new Map<string, string>();
  for (const included of Array.isArray(builds.included) ? builds.included : []) {
    if (included?.type === "preReleaseVersions" && typeof included.attributes?.version === "string") {
      versions.set(included.id, included.attributes.version);
    }
  }
  const buildRows = await Promise.all((Array.isArray(builds.data) ? builds.data : []).slice(0, buildCount).map(async (build: Document) => {
    // Apple's reference lists `limit` here, but the API refuses it without groupBy.
    const { items } = await paginate(get, `/v1/builds/${encodeURIComponent(build.id)}/metrics/betaBuildUsages`);
    const sums = sumValues(items, "installCount", "sessionCount", "crashCount");
    const attributes = build.attributes ?? {};
    return {
      build: String(attributes.version ?? ""),
      version: versions.get(build.relationships?.preReleaseVersion?.data?.id) ?? null,
      uploaded: stringOrNull(attributes.uploadedDate),
      processingState: stringOrNull(attributes.processingState),
      expires: stringOrNull(attributes.expirationDate),
      expired: attributes.expired === true,
      installs: sums.installCount,
      sessions: sums.sessionCount,
      crashes: sums.crashCount,
    };
  }));

  return {
    takenAt: now.toISOString(),
    testersTotal: everyone.size,
    testersPublicLink: publicLink.size,
    testersInstalled: [...everyone.values()].filter((state) => state === "INSTALLED").length,
    sessions30d: usageSums.sessionCount,
    crashes30d: usageSums.crashCount,
    builds: buildRows,
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function storeSnapshot(env: TestFlightEnv, snapshot: TestFlightSnapshot): Promise<void> {
  await env.DB.prepare(`
    INSERT OR REPLACE INTO testflight_snapshots (
      day, taken_at, testers_total, testers_public_link, testers_installed, sessions_30d, crashes_30d, builds_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    snapshot.takenAt.slice(0, 10),
    snapshot.takenAt,
    snapshot.testersTotal,
    snapshot.testersPublicLink,
    snapshot.testersInstalled,
    snapshot.sessions30d,
    snapshot.crashes30d,
    JSON.stringify(snapshot.builds),
  ).run();
}

export type RefreshResult = { status: "ok" } | { status: "key_missing" } | { status: "rate_limited"; retryAfter: number };

/// Fetches and stores today's snapshot. The daily cron skips the rate limit.
export async function refreshTestFlight(env: TestFlightEnv, { limited = false } = {}): Promise<RefreshResult> {
  if (!hasTestFlightKey(env)) return { status: "key_missing" };
  if (limited) {
    const latest = await env.DB.prepare("SELECT MAX(taken_at) AS taken_at FROM testflight_snapshots")
      .first<{ taken_at: string | null }>();
    const last = Math.max(lastAttemptAt, latest?.taken_at ? Date.parse(latest.taken_at) : 0);
    const wait = last + refreshInterval - Date.now();
    if (wait > 0) return { status: "rate_limited", retryAfter: Math.ceil(wait / 1000) };
  }
  lastAttemptAt = Date.now();
  const snapshot = await collectSnapshot(ascClient(await ascToken(env)));
  await storeSnapshot(env, snapshot);
  return { status: "ok" };
}

export async function readTestFlight(env: TestFlightEnv) {
  const dayAt = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
  const [latest, recent] = await Promise.all([
    env.DB.prepare("SELECT * FROM testflight_snapshots ORDER BY day DESC LIMIT 1").first<SnapshotRow>(),
    env.DB.prepare("SELECT day, testers_total, testers_installed FROM testflight_snapshots WHERE day >= ?")
      .bind(dayAt(trendDays - 1)).all<Pick<SnapshotRow, "day" | "testers_total" | "testers_installed">>()
      .then((result) => result.results ?? []),
  ]);
  const byDay = new Map(recent.map((row) => [row.day, row]));
  return {
    configured: hasTestFlightKey(env),
    latest: latest ? presentSnapshot(latest) : null,
    trend: Array.from({ length: trendDays }, (_, index) => {
      const day = dayAt(trendDays - 1 - index);
      const row = byDay.get(day);
      return { day, testers: row?.testers_total ?? null, installed: row?.testers_installed ?? null };
    }),
  };
}

function presentSnapshot(row: SnapshotRow): TestFlightSnapshot {
  let builds: TestFlightBuild[] = [];
  try {
    const parsed: unknown = JSON.parse(row.builds_json);
    if (Array.isArray(parsed)) builds = parsed;
  } catch {}
  return {
    takenAt: row.taken_at,
    testersTotal: row.testers_total,
    testersPublicLink: row.testers_public_link,
    testersInstalled: row.testers_installed,
    sessions30d: row.sessions_30d,
    crashes30d: row.crashes_30d,
    builds,
  };
}
