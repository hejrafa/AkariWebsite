# Akari website and admin handoff

## What lives where

Both applications are in [hejrafa/AkariWebsite](https://github.com/hejrafa/AkariWebsite).

| Service | Code | Production | Deployment |
| --- | --- | --- | --- |
| Public website, privacy, terms and brand | Repository root, `privacy/`, `terms/`, `brand/` | https://joinakari.com | GitHub Pages; every push to `main` |
| Food-feedback dashboard | `feedback-worker/public/` | https://admin.joinakari.com | Cloudflare Worker; separate deployment |
| Login and food-feedback API | `feedback-worker/src/index.ts` | https://api.joinakari.com | Same Worker as the admin dashboard |
| Feedback database | `feedback-worker/migrations/` | Cloudflare D1, `akari-food-feedback` | Apply pending migrations separately |
| Website visit counting | `visit.js` (site), `/v1/visit` and `/admin-api/visits` in `feedback-worker/src/index.ts` | Dashboard page of https://admin.joinakari.com | Site via GitHub Pages; endpoint and dashboard with the Worker |

The Worker is named `akari-food-feedback`. Its domains and database binding are recorded in `feedback-worker/wrangler.jsonc`.

## The public website

The site is intentionally dependency-free and can run locally or on any static host. Only the public files are deployed; the allowlist is in `.github/workflows/pages.yml`. The public TestFlight URL is referenced directly in `index.html`, `llms.txt`, and `llms-full.txt`.

### Themes and images

The site's type and colours follow the app: New York, and the per-theme page, card, ink, accent and launch-screen colours from the iOS project's `AppTheme.swift`. Five themes are offered: Wasserkuppe (`meadow`), Shiratani (`forest`, the default), Loch Tay (`coast`), Green River Overlook (`canyon`) and Plain (`plain`, Schlicht in German). Plain has no painting, so its deep band is the app's dark card colour.

The header and footer logos, `assets/logo/akari-logo-<theme>-<dark|light>.svg`, are the mark from each theme's app icon (its arcs in the theme's gradient and its touches: bolts, leaves, bubbles or drops; Plain has none) above the wordmark. The admin dashboard and its login load the same files at the same 89 × 50 size, so the box must stay that size.

### Brand page

`brand/` is the brand page: a word about Akari, the naming rule, and every logo, the mark alone, the app icons and the colours to download, for each of the five website themes (the app's Wisteria icon is left out). It shares `legal.css` and `legal.js` with the privacy and terms pages; `legal.js` writes its tiles from `brandThemes`. The downloads are in `assets/brand/`, named after the themes as the site shows them (`shiratani`, `loch-tay`, …): the logos as SVG and 2000 px PNG, the mark as SVG and 1024 px PNG, and each app icon on its white and its black tile as a 1024 px PNG. The deploy zips that folder into `brand/akari-brand.zip` for the page's Download everything button.

`python3 tools/export_logos.py` writes the header logos and all of `assets/brand/` from the app's `AppIcon<Theme>.icon` documents (`AppIcon.icon` for Plain), and a local `brand/akari-brand.zip` for preview (git-ignored). It needs macOS with Xcode and Google Chrome for the PNGs; `--svg-only` skips them. Run it when the app's icons change, then bump the logos' `?v=` in the pages, `script.js` and `legal.js`. If a theme's colours change, update `brandThemes` in `legal.js` too.

The app exports everything the landing page shows into `assets/welcome/`: each piece per theme, language and light/dark rendering (`<theme>/<en|de>/<dark|light>/<piece>@2x.webp`, `@3x.webp` and a `@3x.png` source), the app icon per theme in a light and a dark rendition (`<theme>/app-icon-<light|dark>`; the page shows the one matching the mode), the Apple Health icon and the food stickers in `stickers/`. The page shows each piece at its 1x size, picks 2x or 3x by screen density, and swaps with the theme, language and light/dark switches.

The other stickers in `assets/stickers/` (lock, the goal and focus stickers chosen to match the app's icons in `Goal.swift`, the handshake, bar chart and carrot the privacy, terms and dashboard headlines show in place of emoji, the sun behind a cloud by the readiness bar, and the red heart under the pricing plans) are Microsoft Fluent Emoji (MIT, licence alongside) from the revision the app pins (`1ffb34c`); `assets/stickers/README.md` lists each one's source. The dashboard is served by the feedback worker, so it keeps its own baked bar chart and carrot in `feedback-worker/public/assets/stickers/`, made by `pnpm bake` there. The goal tiles' titles and lines are the app's own focus strings in both languages.

### Die-cut edges

Every piece, icon and sticker on the landing page has a cream edge in the theme's `--band-ink` and a soft shadow, as if cut out and stuck on. They are baked into copies of the images rather than drawn by the browser: a runtime filter had to be rasterised per image and on iPhone filled in visibly while scrolling. `tools/bake_die_cuts.py` (Pillow only) writes, for each theme:

- `<piece>-cut@2x|3x.webp` beside each piece, and `app-icon-<mode>-cut` and `apple-health-cut` in `assets/welcome/<theme>/`;
- each food sticker at `assets/welcome/stickers/<theme>/<name>-<width>@2x|3x.webp` and each Fluent sticker at `assets/stickers/<theme>/…`, at widths 56, 72, 92, 120 and 160. A sticker is shown anywhere from about 50 to 180px wide, so the page takes the width nearest its box (`cutImageBase` in `script.js`, and the first pick in `index.html`) and the edge stays close to 3px.

Each baked file is its source on a transparent margin (20px at the sides, 10 above, 30 below at 1x) that holds the edge and shadow. In the page, each image sits in a `.cut` box shaped like the unbaked piece (`--w`/`--h`), and the image spills out of it by that margin, so pieces stay exactly where they were. The readiness bar keeps its own glow and has no edge. The repository keeps only the sources: the deploy bakes into its staged copy of the site, and local bakes are git-ignored. The bake skips anything already up to date, so run it again after the app exports new pieces.

### Languages

The landing page supports English and German without a runtime dependency. An explicit `?lang=en` or `?lang=de` choice wins, followed by the saved preference and then the browser's primary language; all other languages fall back to English. The language switch updates the page copy, accessibility labels, social metadata, structured data, canonical URL, credits page, and web app manifest.

### Search, sharing and AI discovery

- `robots.txt` allows search and AI search crawlers and references the sitemap. `admin.joinakari.com` and `api.joinakari.com` answer `/robots.txt` from the Worker with `Disallow: /`: the dashboard and its login carry `noindex` anyway, and the API is for the app, but Search Console's domain property lists both hosts. The footer's Admin link goes straight to `/login` with `rel="nofollow"`, since `/` redirects there when signed out.
- `sitemap.xml` lists the landing page and the privacy and terms pages in English and German, with the app's pieces from `assets/welcome` as the landing page's images.
- `llms.txt` and `llms-full.txt` provide concise machine-readable product information.
- `manifest.webmanifest` describes the website for browsers and installed shortcuts.
- The icons for search, sharing and home screens are the plain app icon (the logo on black), in `assets/icons/`: `icon-1024.png`, `icon-512.png` and `icon-192.png` as iOS draws it, rounded; `apple-touch-icon-180.png`, `icon-48.png` (the favicon size Google asks for) and `icon-maskable-512.png` as opaque squares. `assets/social.png` is the sharing card that links show in messages and on social sites: the Plain logo for light backgrounds (the mark above the wordmark) centred on white, drawn by `tools/export_logos.py`; bump its `?v=` in `index.html` and `script.js` when it changes. `python3 tools/export_plain_icons.py` renders the icons from the app's `AppIcon.icon` (macOS with Xcode and Pillow); bump their `?v=` in the pages and manifests when they change. `favicon.svg` is the plain mark itself.
- The page includes Open Graph, X/Twitter, canonical, and `Organization` (its `logo` is the plain icon), `SoftwareApplication` and `FAQPage` JSON-LD metadata. `script.js` rebuilds them for the chosen language from the same strings the page shows, so update `pageMetadata` and the FAQ copy there and mirror the English version in `index.html`.

## Website visits

Every public page loads `visit.js`, which sends one beacon per page load to `https://api.joinakari.com/v1/visit`: the path and the referring host or `utm_source`/`ref` tag. It sets no cookies and stores nothing in the browser, and it does nothing on localhost. The Worker drops requests from other origins and obvious bots, adds Cloudflare's country code, and stores a 16-character hash of the IP address and user agent with a random salt kept in `site_visit_salts` for the current UTC day only. The IP address and user agent are never stored; the first visit of a new day deletes older salts, so earlier hashes can't be linked to anyone. Visitors over a range are therefore the sum of daily visitors. The privacy policy's "Visiting this website" section describes this; update it if the beacon collects anything new. The landing, privacy and terms pages load `visit.js`, so add it to any new public page.

The dashboard reads `/admin-api/visits?days=7|30|90`. Locally, with no visits recorded, it shows labelled sample data.

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
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000 for the public website. The bake writes the page's die-cut pieces and stickers next to their sources (see [Die-cut edges](#die-cut-edges)).

In a second terminal, from the repository:

```sh
cd feedback-worker
pnpm install --frozen-lockfile
pnpm migrate:local
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
