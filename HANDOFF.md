# Akari website and admin handoff

## What lives where

Both applications are in [hejrafa/AkariWebsite](https://github.com/hejrafa/AkariWebsite).

| Service | Code | Production | Deployment |
| --- | --- | --- | --- |
| Public website, privacy, terms, brand and about us | Repository root, `privacy/`, `terms/`, `brand/`, `about-us/` | https://joinakari.com | GitHub Pages; every push to `main` |
| Food-feedback dashboard | `feedback-worker/public/` | https://admin.joinakari.com | Cloudflare Worker; separate deployment |
| Login and food-feedback API | `feedback-worker/src/index.ts` | https://api.joinakari.com | Same Worker as the admin dashboard |
| Feedback database | `feedback-worker/migrations/` | Cloudflare D1, `akari-food-feedback` | Apply pending migrations separately |
| Website visit counting | `visit.js` (site), `/v1/visit` and `/admin-api/visits` in `feedback-worker/src/index.ts` | Dashboard page of https://admin.joinakari.com | Site via GitHub Pages; endpoint and dashboard with the Worker |
| AI usage and cost | Counted by `photo-worker/` into `usage_days`, read by `feedback-worker/src/usage.ts` | Dashboard page of https://admin.joinakari.com | Both Workers; the table is the photo worker's migration |
| Cloudflare usage against the free plan | `feedback-worker/src/cloudflare.ts`, `cloudflare_days` | Dashboard page of https://admin.joinakari.com | With the Worker; needs the `CF_ANALYTICS_TOKEN` secret |

The Worker is named `akari-food-feedback`. Its domains and database bindings are recorded in `feedback-worker/wrangler.jsonc`.

## The public website

The site is intentionally dependency-free and can run locally or on any static host. Only the public files are deployed; the allowlist is in `.github/workflows/pages.yml`. The public TestFlight URL is referenced directly in `index.html`, `llms.txt`, and `llms-full.txt`.

### Layout

Every page, the admin dashboard included, shares the landing page's two widths: the header spans `--chrome-width` (1280 px), the content and the footer `--content-width` (1180 px), each with a 24 px gutter on either side, 16 px on phones (760 px and narrower). `styles.css`, `legal.css` and `feedback-worker/public/assets/admin.css` each define both at the top; change all three together.

A new page puts its content in `width: min(var(--content-width), calc(100% - 48px))` (`calc(100% - 32px)` on phones), as the landing page's sections, `.legal-content` and the dashboard's `.page-shell` do. Inside it a block may be narrower and centred where that reads better (the landing page's pricing and goals, the About us letter), but the page's edges stay where the landing page's are. Running text keeps a measure of about 34em, so on wide screens the privacy, terms and brand cards put their heading on the left and their words on the right, like the landing page's FAQ.

### Themes and images

The site's type and colours follow the app: New York, and the per-theme page, card, ink, accent and launch-screen colours from the iOS project's `AppTheme.swift`. Five themes are offered: Wasserkuppe (`meadow`), Shiratani (`forest`, the default), Loch Tay (`coast`), Green River Overlook (`canyon`) and Plain (`plain`, Schlicht in German). Plain has no painting, so its deep band is the app's dark card colour.

The header and footer logos, `assets/logo/akari-logo-<theme>-<dark|light>.svg`, are the mark from each theme's app icon (its arcs in the theme's gradient and its touches: bolts, leaves, bubbles or drops; Plain has none) above the wordmark. The admin dashboard and its login load the same files at the same 89 × 50 size, so the box must stay that size.

### About us page

`about-us/` is a short letter from the two founders, signed by hand, then what we hold to on the deep band, then the landing page's closing call ("Akari is almost here.", the `.shape` section, with its words copied from `script.js`). It uses the legal pages' header, footer and `legal.css`, with its words in `pageTranslations["about-us"]` in `legal.js`. The signature is set in Mrs Saint Delafield, self-hosted as `assets/fonts/MrsSaintDelafield-latin.woff2` (its Latin subset from Google Fonts, SIL Open Font License alongside); load no font from Google's servers.

### Brand page

`brand/` is the brand page: a word about Akari, the naming rule, and every logo, the mark alone, the app icons and the colours to download, for each of the five website themes (the app's Wisteria icon is left out). It shares `legal.css` and `legal.js` with the privacy and terms pages; `legal.js` writes its tiles from `brandThemes`. The downloads are in `assets/brand/`, named after the themes as the site shows them (`shiratani`, `loch-tay`, …): the logos as SVG and 2000 px PNG, the mark as SVG and 1024 px PNG, and each app icon on its white and its black tile as a 1024 px PNG. The deploy zips that folder into `brand/akari-brand.zip` for the page's Download everything button.

`python3 tools/export_logos.py` writes the header logos and all of `assets/brand/` from the app's `AppIcon<Theme>.icon` documents (`AppIcon.icon` for Plain), and a local `brand/akari-brand.zip` for preview (git-ignored). It needs macOS with Xcode and Google Chrome for the PNGs; `--svg-only` skips them. Run it when the app's icons change, then bump the logos' `?v=` in the pages, `script.js` and `legal.js`. If a theme's colours change, update `brandThemes` in `legal.js` too.

The app exports everything the landing page shows into `assets/welcome/`: each piece per theme, language and light/dark rendering (`<theme>/<en|de>/<dark|light>/<piece>@2x.webp`, `@3x.webp` and a `@3x.png` source), the app icon per theme in a light and a dark rendition (`<theme>/app-icon-<light|dark>`; the page shows the one matching the mode), the Apple Health icon and the food stickers in `stickers/`. The page shows each piece at its 1x size, picks 2x or 3x by screen density, and swaps with the theme, language and light/dark switches.

The other stickers in `assets/stickers/` (lock, the goal and focus stickers chosen to match the app's icons in `Goal.swift`, the handshake, bar chart and carrot the privacy, terms and dashboard headlines show in place of emoji, the sun behind a cloud by the readiness bar, and the red heart under the pricing plans) are Microsoft Fluent Emoji (MIT, licence alongside) from the revision the app pins (`1ffb34c`); `assets/stickers/README.md` lists each one's source. The dashboard is served by the feedback worker, so it keeps its own baked bar chart and carrot in `feedback-worker/public/assets/stickers/`, made by `pnpm bake` there. The goal tiles' titles and lines are the app's own focus strings in both languages.

### Die-cut edges

Every piece, icon and sticker on the landing page has a cream edge in the theme's `--band-ink` and a soft shadow, as if cut out and stuck on. They are baked into copies of the images rather than drawn by the browser: a runtime filter had to be rasterised per image and on iPhone filled in visibly while scrolling. `tools/bake_die_cuts.py` (Pillow only) writes, for each theme:

- `<piece>-cut@2x|3x.webp` beside each piece, and `app-icon-<mode>-cut` and `apple-health-cut` in `assets/welcome/<theme>/`;
- each food sticker at `assets/welcome/stickers/<theme>/<name>-<width>@2x|3x.webp` and each Fluent sticker at `assets/stickers/<theme>/…`, at widths 34, 43, 56, 72, 92, 120 and 160. A sticker is shown anywhere from about 34 (a legal page's headline on a phone) to 180px wide, so the page takes the width nearest its box (`cutImageBase` in `script.js`, and the first pick in `index.html`) and the edge stays close to 3px. The privacy, terms, brand and about pages (`updateStickers` in `legal.js`) take the width about a tenth under the box instead, an edge near 3.3px, so a headline sticker is never thinner than the landing page's; the brand page's headline also takes the app icon at these widths, baked as `assets/welcome/<theme>/app-icon-<mode>-<width>-cut@2x|3x.webp`.

Each baked file is its source on a transparent margin (20px at the sides, 10 above, 30 below at 1x) that holds the edge and shadow. In the page, each image sits in a `.cut` box shaped like the unbaked piece (`--w`/`--h`), and the image spills out of it by that margin, so pieces stay exactly where they were. The readiness bar keeps its own glow and has no edge. The repository keeps only the sources: the deploy bakes into its staged copy of the site, and local bakes are git-ignored. The bake skips anything already up to date, so run it again after the app exports new pieces.

### Languages

Every page has an English and a German address. English stays at `/`, `/privacy/`, `/terms/` and `/brand/`, which the app links to, and `/about-us/`; German is `/de/`, `/de/datenschutz/`, `/de/nutzungsbedingungen/`, `/de/marke/` and `/de/ueber-uns/`. The table is `PAGES` in `tools/language_pages.py`, and `languagePaths` in `script.js` and `legal.js` keeps the same one; change all three together, along with the hreflang links in the pages and `sitemap.xml`.

Only the English pages are in the repository. `python3 tools/language_pages.py build --root site` makes each German page from its English one in the deploy's staged site: the same file, with `<html lang="de">`, the German title, description and sharing cards (read from `pageMetadata` in `script.js` and `legal.js`, and `commonTranslations` for the image text), its own canonical address, and links to the other German pages. The page's script writes the German words on load, as the switch does. A German string the build can't find stops the deploy rather than shipping an English card on a German page. The landing page uses root-relative addresses (`/assets/…`, `/script.js`) so its copy at `/de/` finds the same files.

A missing address gets `404.html` from the repository root: GitHub Pages serves that one file for every path it can't find, `/de/…` included, so there is no German copy and no `/de/404/`. Its head script takes the language from the address (German under `/de/`, English elsewhere), and `legal.js` writes the words from `pageTranslations["not-found"]` and points its one link at `/` or `/de/`. It uses the legal pages' header, footer, `legal.css` and stickers, carries `noindex`, and every path in it is absolute, since it is served at any depth. `language_pages.py serve` answers a missing address with it too.

A page's `<html lang>` is its language. On an English address, the saved preference and then the browser's primary language decide: a German reader goes on to the German address before the page draws. A German address always shows German. Old `?lang=de` and `?lang=en` links still work: they go to that language's address, and the parameter is dropped. The language switch changes the words in place and the address with them, along with the accessibility labels, social metadata, structured data, canonical URL, credits page, and web app manifest.

### Search, sharing and AI discovery

- `robots.txt` allows search and AI search crawlers and references the sitemap. `admin.joinakari.com` and `api.joinakari.com` answer `/robots.txt` from the Worker with `Disallow: /`: the dashboard and its login carry `noindex` anyway, and the API is for the app, but Search Console's domain property lists both hosts. The footer's Admin link goes straight to `/login` with `rel="nofollow"`, since `/` redirects there when signed out.
- `sitemap.xml` lists the landing, privacy, terms, brand and about-us pages at their English and German addresses, with the app's pieces from `assets/welcome` as the landing page's images.
- `llms.txt` and `llms-full.txt` provide concise machine-readable product information.
- `manifest.webmanifest` describes the website for browsers and installed shortcuts.
- The icons for search, sharing and home screens are the plain app icon (the logo on black), in `assets/icons/`: `icon-1024.png`, `icon-512.png` and `icon-192.png` as iOS draws it, rounded; `apple-touch-icon-180.png`, `icon-48.png` (the favicon size Google asks for) and `icon-maskable-512.png` as opaque squares. `assets/social.png` is the sharing card that links show in messages and on social sites: the Plain logo for light backgrounds (the mark above the wordmark) centred on white, drawn by `tools/export_logos.py`; bump its `?v=` in `index.html` and `script.js` when it changes. `python3 tools/export_plain_icons.py` renders the icons from the app's `AppIcon.icon` (macOS with Xcode and Pillow); bump their `?v=` in the pages and manifests when they change. `favicon.svg` is the plain mark itself.
- The page includes Open Graph, X/Twitter, canonical, and `Organization` (its `logo` is the plain icon), `SoftwareApplication` and `FAQPage` JSON-LD metadata. `script.js` rebuilds them for the chosen language from the same strings the page shows, so update `pageMetadata` and the FAQ copy there and mirror the English version in `index.html`.

## Website visits

Every public page loads `visit.js`, which sends one beacon per page load to `https://api.joinakari.com/v1/visit`: the path and the referring host or `utm_source`/`ref` tag. It sets no cookies and stores nothing in the browser, and it does nothing on localhost. The Worker drops requests from other origins and obvious bots, adds Cloudflare's country code, and stores a 16-character hash of the IP address and user agent with a random salt kept in `site_visit_salts` for the current UTC day only. The IP address and user agent are never stored; the first visit of a new day deletes older salts, so earlier hashes can't be linked to anyone. Visitors over a range are therefore the sum of daily visitors. The privacy policy's "Visiting this website" section describes this; update it if the beacon collects anything new. Every public page loads `visit.js`, so add it to any new one.

The dashboard reads `/admin-api/visits?days=7|30|90`. Locally, with no visits recorded, it shows labelled sample data.

The dashboard has no Refresh buttons: App testers and Cloudflare show their stored numbers at once and, when those are older than the server's wait between fetches (10 minutes for App Store Connect, 15 for Cloudflare), fetch new ones behind them. The heading says so only when that fails. The 06:00 cron keeps a row for every day either way, for the 30-day trends.

## AI usage

The photo worker (`api.joinakari.com/photo`, `/meal`, `/compose`) adds every call that reaches Anthropic to its UTC day's row in `usage_days`, one row per endpoint: the request, a failure when Anthropic or its answer failed, and the input, output, cache-read and cache-write tokens. Nothing else is stored, and its 03:00 cron keeps 400 days. The table lives in the photo worker's `akari-photo-counters` database (`photo-worker/migrations/0002_usage.sql`); the dashboard Worker reads it through a second binding, `USAGE`, by convention read only.

`/admin-api/usage?days=7|30|90` prices the tokens with the vars `AI_PRICE_INPUT`, `AI_PRICE_OUTPUT`, `AI_PRICE_CACHE_READ` and `AI_PRICE_CACHE_WRITE` in `feedback-worker/wrangler.jsonc`, US dollars per million tokens. They are Claude Haiku 5.5's prices from platform.claude.com on 22 October 2026, for prompts up to 100,000 tokens; change them there when the model or its prices change. The dashboard's AI usage section has two cards for the chosen 7, 30 or 90 days: meals logged and photos read, with their totals over a bar a day, and the cost, with its total over a line. Meals are `/compose` and `/meal` (which only build 133 of 16 October still calls); photos are `/photo`.

## Cloudflare usage

The 06:00 cron, and opening the dashboard when the stored numbers are older than 15 minutes (the server's wait between fetches), ask Cloudflare's GraphQL Analytics API for yesterday and today, and store one row per day in `cloudflare_days`: Workers requests and errors over every script in the account, D1 rows read and written over every database, the largest database's size, and the zone's requests. Yesterday is fetched again because its numbers are only complete the morning after. The dashboard's Cloudflare section shows the latest day (server calls beside their last 30 days, then database reads, writes and the biggest database) against the free plan's limits (vars `CF_LIMIT_WORKER_REQUESTS`, `CF_LIMIT_D1_ROWS_READ`, `CF_LIMIT_D1_ROWS_WRITTEN`, `CF_LIMIT_D1_DATABASE_BYTES`, as of 22 October 2026); a bar past 80 % turns red and says so. Storage is measured per database, against the free plan's 500 MB cap for each: a database reaches that before the account reaches its 5 GB in total.

It needs a Cloudflare API token with **Account Analytics: Read** for the account and **Zone Analytics: Read** for `joinakari.com`, stored as a secret from `feedback-worker/`:

```sh
pnpm exec wrangler secret put CF_ANALYTICS_TOKEN
```

`CF_ACCOUNT_ID` is in `wrangler.jsonc`. `CF_ZONE_ID` is empty until set: copy the zone ID from the `joinakari.com` overview in the Cloudflare dashboard. The zone's requests are stored but not shown, so it can stay empty; without the token the section says so and nothing else changes.

## Access for a co-maintainer

There are three independent kinds of access:

1. **Admin login:** the person's own email and generated password, supplied privately. This lets them review and update food feedback. It does not grant code or deployment access.
2. **GitHub collaborator:** the repository owner can open [Settings → Collaborators](https://github.com/hejrafa/AkariWebsite/settings/access), choose **Add people**, and invite the person's GitHub account or email. They must accept the invitation to push changes. The repository is currently public, so reading and cloning require no invitation. [GitHub invitation instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository).
3. **Cloudflare member:** invite the person's own Cloudflare account and grant **Editor** for the existing `akari-food-feedback` Worker. Also grant the D1 permissions needed to manage its database if they will apply migrations. Changing domains/routes additionally requires **Workers Routes Write** for `joinakari.com`; deploying code to an already configured Worker only requires Worker Editor access. [Cloudflare roles and scopes](https://developers.cloudflare.com/workers/authorization/workers/).

Share the generated admin login through a password-manager share. Each maintainer should sign in to GitHub and Cloudflare using their own account. No personal GitHub token, Cloudflare login, or existing owner's admin password needs to be handed over.

For shared ownership later, consider moving the repository to a company GitHub organization. A personal repository has one owner; collaborator access is sufficient for day-to-day development. [GitHub repository permission levels](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository).

## Start locally

Install Git, Python 3, Node.js 24 or later, and pnpm. Then:

```sh
git clone https://github.com/hejrafa/AkariWebsite.git
cd AkariWebsite
pip install pillow  # once
python3 tools/bake_die_cuts.py
python3 tools/language_pages.py serve 8000
```

Open http://127.0.0.1:8000 for the public website. The bake writes the page's die-cut pieces and stickers next to their sources (see [Die-cut edges](#die-cut-edges)). The server is a plain static server that also answers the German addresses, making each German page from its English one as it's asked for (see [Languages](#languages)); a plain `python3 -m http.server` would show only the English pages.

In a second terminal, from the repository:

```sh
cd feedback-worker
pnpm install --frozen-lockfile
pnpm migrate:local
pnpm exec wrangler d1 migrations apply akari-photo-counters --local
pnpm dev --ip 127.0.0.1
```

Open http://127.0.0.1:8791 for the admin dashboard. The development server listens on port 8791 (set in `wrangler.jsonc`), which is where the simulator build of the app sends food feedback. Local development uses a local D1 database and bypasses login on localhost; keep the development server bound to your own machine. Production passwords and production feedback are not required for local development.

## Make and deploy changes

Use a feature branch and a pull request so both founders can review changes.

```sh
git switch -c your-name/describe-the-change
```

### Public website

Preview the edited pages locally, then merge the pull request into `main`. The [Deploy Akari Website workflow](https://github.com/hejrafa/AkariWebsite/actions/workflows/pages.yml) publishes the public site automatically. Check that its latest run succeeds.

### Admin dashboard and API

From `feedback-worker/`:

```sh
pnpm check
pnpm test
pnpm exec wrangler login
```

After merging the change, pull the current `main`. If the change contains a database migration, inspect it, verify the target database, and apply it before deploying code that needs it:

```sh
pnpm exec wrangler d1 migrations list akari-food-feedback --remote
pnpm migrate:remote
```

The `USAGE` binding is the photo worker's database, and its migrations are the photo worker's: apply them from `photo-worker/` as its README says, before deploying either Worker's code that needs them.

Then deploy:

```sh
pnpm deploy
```

The website's GitHub Pages workflow does **not** deploy the Worker. Check https://api.joinakari.com/health, then sign in at https://admin.joinakari.com and confirm reports load. A health response verifies the Worker is running; loading reports also verifies the database binding.

If a database command reports that the account is unauthorized, check the signed-in Cloudflare account and its D1 permissions. Do not create a replacement database or alter the configured database ID to work around an access error.

## Admin account management

The original owner uses the existing `ADMIN_EMAIL` variable and `ADMIN_PASSWORD_HASH` secret. `ADMIN_PASSWORD_HASH` must be in the PBKDF2 format produced by `pnpm admin:create --owner`; an older bare SHA-256 value no longer signs in. `SESSION_SECRET` signs login sessions. Additional accounts live in the encrypted `ADDITIONAL_ADMINS` Worker secret as a JSON list of email addresses and salted password hashes. Account changes need no database migration.

Generate an additional login from `feedback-worker/`:

```sh
pnpm admin:create colleague@example.com
```

This writes the complete account list to `~/.config/akari/admin-users.json` and the new login to a separate private text file in the same directory. It prints their locations, without printing the password. The generator uses Node's cryptographic random source and PBKDF2-SHA256 for the password hash; runtime tests cover signing in and revoking sessions.

Before changing additional accounts on another computer, restore the **current complete** `admin-users.json` from the founders' shared password manager. Cloudflare does not return stored secret values. Uploading a new list replaces the entire `ADDITIONAL_ADMINS` secret, so an incomplete list would remove other co-maintainers' access.

Upload the updated list:

```sh
pnpm exec wrangler secret put ADDITIONAL_ADMINS < "$HOME/.config/akari/admin-users.json"
```

Keep the updated list in the shared password manager. Share only the intended person's login details with that person.

To rotate a password, run `pnpm admin:create colleague@example.com --rotate`, then upload the complete account list again. To revoke an additional account, remove its entry from the private JSON list and upload the remaining list (or `[]` if empty). Removing an account or rotating its password invalidates its existing sessions. Sessions expire after eight hours. There is no email invitation or self-service password-reset flow; changes are maintained through this process.

The repository is public. GitHub Pages serves only the allowlisted public files staged in `.github/workflows/pages.yml`; add new public files or directories there. Keep passwords, tokens, private account lists, and production feedback exports outside the repository. The account generator defaults to a private directory outside the checkout.

### Rotate the owner password

The owner login is `ADMIN_EMAIL` with the `ADMIN_PASSWORD_HASH` secret. Generate a new password and hash from `feedback-worker/`:

```sh
pnpm admin:create --owner
```

This writes the new login to `~/.config/akari/admin-login-owner.txt` and prints the PBKDF2 hash together with the exact upload command, `printf '%s' '<hash>' | pnpm exec wrangler secret put ADMIN_PASSWORD_HASH`. It does not change `admin-users.json`. The previous owner password stops working as soon as the secret is uploaded, so store the new login in the password manager first. No deploy is needed for a secret change.
