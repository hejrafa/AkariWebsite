// AI usage for the dashboard: the photo worker's usage_days rows, read through
// the USAGE binding to its COUNTERS database (read only, by convention; the
// photo worker owns its rows and its migrations), priced per million tokens.

export interface UsageEnv {
  USAGE?: D1Database;
  AI_PRICE_INPUT?: string;
  AI_PRICE_OUTPUT?: string;
  AI_PRICE_CACHE_READ?: string;
  AI_PRICE_CACHE_WRITE?: string;
}

export interface Prices {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

interface Tokens {
  requests: number;
  failures: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

interface UsageRow extends Tokens {
  day: string;
  endpoint: string;
}

// Claude Haiku 5.5 (claude-haiku-5-5) in US dollars per million tokens: base input,
// output, cache hits and 5-minute cache writes, as platform.claude.com's pricing page
// listed them on 2026-10-22. They hold for prompts up to 100,000 tokens; the photo
// worker's prompts stay far below that, and a day's totals couldn't tell one apart.
const defaultPrices: Prices = { input: 0.10, output: 0.50, cacheRead: 0.01, cacheWrite: 0.125 };
const ranges = new Set([7, 30, 90]);
export const usageEndpoints = ["compose", "photo", "meal"] as const;

export function prices(env: UsageEnv): Prices {
  const price = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return value?.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    input: price(env.AI_PRICE_INPUT, defaultPrices.input),
    output: price(env.AI_PRICE_OUTPUT, defaultPrices.output),
    cacheRead: price(env.AI_PRICE_CACHE_READ, defaultPrices.cacheRead),
    cacheWrite: price(env.AI_PRICE_CACHE_WRITE, defaultPrices.cacheWrite),
  };
}

/// Dollars for a set of token counts, to a millionth of a dollar.
export function costOf(tokens: Tokens, price: Prices): number {
  const dollars = (
    tokens.input_tokens * price.input +
    tokens.output_tokens * price.output +
    tokens.cache_read_tokens * price.cacheRead +
    tokens.cache_write_tokens * price.cacheWrite
  ) / 1_000_000;
  return Math.round(dollars * 1_000_000) / 1_000_000;
}

function present(tokens: Tokens, price: Prices) {
  return {
    requests: tokens.requests,
    failures: tokens.failures,
    inputTokens: tokens.input_tokens,
    outputTokens: tokens.output_tokens,
    cacheReadTokens: tokens.cache_read_tokens,
    cacheWriteTokens: tokens.cache_write_tokens,
    cost: costOf(tokens, price),
  };
}

const none = (): Tokens => ({ requests: 0, failures: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 });

function add(total: Tokens, row: Tokens): Tokens {
  return {
    requests: total.requests + (row.requests ?? 0),
    failures: total.failures + (row.failures ?? 0),
    input_tokens: total.input_tokens + (row.input_tokens ?? 0),
    output_tokens: total.output_tokens + (row.output_tokens ?? 0),
    cache_read_tokens: total.cache_read_tokens + (row.cache_read_tokens ?? 0),
    cache_write_tokens: total.cache_write_tokens + (row.cache_write_tokens ?? 0),
  };
}

/// Each day of the range with its endpoints, today, and this month so far, every
/// one with its cost.
export async function readUsage(env: UsageEnv, requestedDays: number, now = new Date()) {
  const days = ranges.has(requestedDays) ? requestedDays : 30;
  const price = prices(env);
  const dayAt = (offset: number) => new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  const monthStart = `${now.toISOString().slice(0, 7)}-01`;

  let rows: UsageRow[] = [];
  let month = none();
  if (env.USAGE) {
    const since = [dayAt(days - 1), monthStart].sort()[0];
    rows = (await env.USAGE.prepare(`
      SELECT day, endpoint, requests, failures, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
      FROM usage_days WHERE day >= ? AND day <= ?
    `).bind(since, dayAt(0)).all<UsageRow>()).results ?? [];
    for (const row of rows) {
      if (row.day >= monthStart) month = add(month, row);
    }
  }

  const byDay = new Map<string, UsageRow[]>();
  for (const row of rows) byDay.set(row.day, [...(byDay.get(row.day) ?? []), row]);
  const daily = Array.from({ length: days }, (_, index) => {
    const day = dayAt(days - 1 - index);
    const dayRows = byDay.get(day) ?? [];
    const endpoints = Object.fromEntries(usageEndpoints.map((endpoint) => [
      endpoint,
      present(dayRows.filter((row) => row.endpoint === endpoint).reduce(add, none()), price),
    ]));
    return { day, ...present(dayRows.reduce(add, none()), price), endpoints };
  });

  return {
    configured: Boolean(env.USAGE),
    days,
    prices: price,
    daily,
    today: daily[daily.length - 1],
    month: { since: monthStart, ...present(month, price) },
  };
}
