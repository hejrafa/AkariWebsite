# akari-photo

The Cloudflare worker behind `api.joinakari.com/photo`, `/meal` and `/compose`. Each asks Claude Haiku about a meal the app logged; every word Haiku reads is in `src/prompt.ts`, and the daily counters in D1 are the only state.

- `POST /photo`: a JPEG or PNG in, the main food and a meal line out.
- `POST /meal`: the meal line, the phone's catalogue candidates and optionally the photo in, Haiku's picks out. Kept for the builds that still use it.
- `POST /compose`: the meal line, optionally the photo and up to five catalogue dishes (templates) in; the meal built from Akari's verified generic foods out, as dishes with their ingredients, sides and drinks, with grams for one person. A food with no fitting id comes back with `reference: null` and `missing: true` and is listed in `missing`. The worker checks every reference against the vocabulary and the sent templates.

## Vocabulary

`/compose` may answer only with ids from `src/vocabulary.json` or from the templates the phone sent. The file is generated from `verified-foods.json` on the main branch of the public [AkariFoodIndex](https://github.com/hejrafa/AkariFoodIndex) repo, which mirrors the app, and records the commit it came from. The whole list goes into the system prompt as `id | English name | German name`, cached, so it is paid for once per cache window.

## Deploy

Fetch the vocabulary before every deploy, so the worker knows the foods the app ships:

```sh
pnpm install
pnpm vocab
pnpm check
pnpm test
pnpm deploy
```

`pnpm test` runs `node --test` against a stubbed Anthropic and an in-memory D1; it makes no network calls. The Anthropic key and the scoreboard device id are secrets (`wrangler secret put ANTHROPIC_API_KEY`, `SCOREBOARD_DEVICE`).
