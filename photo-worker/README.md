# akari-photo

The Cloudflare worker behind `api.joinakari.com/photo`, `/meal` and `/compose`. Each asks Claude Haiku about a meal the app logged; every word Haiku reads is in `src/prompt.ts`, and the daily counters in D1 are the only state.

## Usage

Every call that reaches Anthropic adds to its UTC day's row in `usage_days` (`migrations/0002_usage.sql`), one row per endpoint (`photo`, `meal`, `compose`): one request, a failure when Anthropic or its answer failed, and the response's input, output, cache-read and cache-write tokens. A call refused before Anthropic (a cap, a malformed body) adds nothing. No text, device or address is stored. The row is written through `waitUntil` after the answer, so it never delays it. The 03:00 cron keeps these rows for 400 days; the admin dashboard reads them through its `USAGE` binding to the same database and turns them into cost.

- `POST /photo`: a JPEG or PNG in, the main food and a meal line out.
- `POST /meal`: the meal line, the phone's catalogue candidates and optionally the photo in, Haiku's picks out. Kept for the builds that still use it.
- `POST /compose`: the meal line, optionally the photo and up to five catalogue dishes (templates) in; the meal built from Akari's verified generic foods out, as dishes with their ingredients, sides and drinks, with grams for one person. A food with no fitting id comes back with `reference: null` and `missing: true` and is listed in `missing`. The worker checks every reference against the vocabulary and the sent templates, and gives a food or part left without an id a second look: when its name, folded for case, accents and one plural ending and without a leading "mixed" or "fresh", is exactly one row's name or alias, it takes that row's id and keeps its own name. The log line counts these as `resolved`.

## Vocabulary

`/compose` may answer only with ids from `src/vocabulary.json` or from the templates the phone sent. The file is generated from `verified-foods.json` on the main branch of the public [AkariFoodIndex](https://github.com/hejrafa/AkariFoodIndex) repo, which mirrors the app, and records the commit it came from. The whole list goes into the system prompt as `id | English name | German name`, cached, so it is paid for once per cache window. When the file also has a `drinks` list (whole drinks such as `cafe:generic:flat-white-with-oat-milk`), those are written too and listed after the foods as one item each, never composed.

## Deploy

Fetch the vocabulary before every deploy, so the worker knows the foods the app ships:

```sh
pnpm install
pnpm vocab
pnpm check
pnpm test
pnpm exec wrangler d1 migrations apply akari-photo-counters --remote
pnpm deploy
```

Apply pending migrations before deploying code that needs them (`wrangler d1 migrations list akari-photo-counters --remote` shows them).

`pnpm test` runs `node --test` against a stubbed Anthropic and an in-memory D1; it makes no network calls. The Anthropic key and the scoreboard device id are secrets (`wrangler secret put ANTHROPIC_API_KEY`, `SCOREBOARD_DEVICE`).
