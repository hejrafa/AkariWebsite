# Akari website

A lightweight static website for Akari, deployed to [joinakari.com](https://joinakari.com/). It is intentionally dependency-free and can run locally or on any static host.

The admin dashboard and food-feedback API are in `feedback-worker/`. See [the maintainer handoff](HANDOFF.md) for access, local development, admin accounts, and deployment instructions for both parts.

## Run locally

```sh
pip install pillow  # once
python3 tools/bake_die_cuts.py
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. The bake writes the page's die-cut pieces and stickers next to their sources (git-ignored; see below). It skips anything already up to date, so run it again after the app exports new pieces.

## Discovery files

- `robots.txt` allows search and AI search crawlers and references the sitemap. `admin.joinakari.com` and `api.joinakari.com` answer `/robots.txt` from the Worker with `Disallow: /`: the dashboard and its login carry `noindex` anyway, and the API is for the app, but Search Console's domain property lists both hosts. The footer's Admin link goes straight to `/login` with `rel="nofollow"`, since `/` redirects there when signed out.
- `sitemap.xml` lists the landing page and the privacy and terms pages in English and German, with the app's pieces from `assets/welcome` as the landing page's images.
- `llms.txt` and `llms-full.txt` provide concise machine-readable product information.
- `manifest.webmanifest` describes the website for browsers and installed shortcuts.
- The icons for search, sharing and home screens are the plain app icon (the logo on black), in `assets/icons/`: `icon-1024.png`, `icon-512.png` and `icon-192.png` as iOS draws it, rounded; `apple-touch-icon-180.png`, `icon-48.png` (the favicon size Google asks for) and `icon-maskable-512.png` as opaque squares. `assets/social.png` is the sharing card, the icon and the wordmark on black. `python3 tools/export_plain_icons.py` renders all of them from the app's `AppIconPlain.icon` (macOS with Xcode and Chrome); bump their `?v=` in the pages and manifests when they change. `favicon.svg` is the plain mark itself.
- The page includes Open Graph, X/Twitter, canonical, and `Organization` (its `logo` is the plain icon), `SoftwareApplication` and `FAQPage` JSON-LD metadata. `script.js` rebuilds them for the chosen language from the same strings the page shows, so update `pageMetadata` and the FAQ copy there and mirror the English version in `index.html`.

The site's type and colours follow the app: New York, and the per-theme page, card, ink, accent and launch-screen colours from the iOS project's `AppTheme.swift`. Five themes are offered: Wasserkuppe (`meadow`), Shiratani (`forest`, the default), Loch Tay (`coast`), Green River Overlook (`canyon`) and Sun (`plain`; the app called it Plain until it was renamed, and the keys, folders and colour tables keep that name). Sun has no painting, so its deep band is the app's dark card colour and its logo mark uses the app's yellow-to-orange launch gradient (`assets/logo/akari-logo-plain-*.svg`). The app exports everything the landing page shows into `assets/welcome/`: each piece per theme, language and light/dark rendering (`<theme>/<en|de>/<dark|light>/<piece>@2x.webp`, `@3x.webp` and a `@3x.png` source), the app icon per theme (`<theme>/app-icon-<light|dark>`, dark only for Sun), the Apple Health icon and the food stickers in `stickers/`. The page shows each piece at its 1x size, picks 2x or 3x by screen density, and swaps with the theme, language and light/dark switches. The other stickers in `assets/stickers/` (lock, the goal and focus stickers chosen to match the app's icons in `Goal.swift`, the handshake, bar chart and carrot the privacy, terms and dashboard headlines show in place of emoji, and the sun behind a cloud by the readiness bar) are Microsoft Fluent Emoji (MIT, licence alongside) from the revision the app pins (`1ffb34c`); `assets/stickers/README.md` lists each one's source. The dashboard is served by the feedback worker, so it keeps its own baked bar chart and carrot in `feedback-worker/public/assets/stickers/`, made by `pnpm bake` there. The goal tiles' titles and lines are the app's own focus strings in both languages. Only the public files are deployed; the allowlist is in `.github/workflows/pages.yml`. The public TestFlight URL is referenced directly in `index.html`, `llms.txt`, and `llms-full.txt`.

## Die-cut edges

Every piece, icon and sticker on the landing page has a cream edge in the theme's `--band-ink` and a soft shadow, as if cut out and stuck on. They are baked into copies of the images rather than drawn by the browser: a runtime filter had to be rasterised per image and on iPhone filled in visibly while scrolling. `tools/bake_die_cuts.py` (Pillow only) writes, for each theme:

- `<piece>-cut@2x|3x.webp` beside each piece, and `app-icon-<mode>-cut` and `apple-health-cut` in `assets/welcome/<theme>/`;
- each food sticker at `assets/welcome/stickers/<theme>/<name>-<width>@2x|3x.webp` and each Fluent sticker at `assets/stickers/<theme>/…`, at widths 56, 72, 92, 120 and 160. A sticker is shown anywhere from about 50 to 180px wide, so the page takes the width nearest its box (`cutImageBase` in `script.js`, and the first pick in `index.html`) and the edge stays close to 3px.

Each baked file is its source on a transparent margin (20px at the sides, 10 above, 30 below at 1x) that holds the edge and shadow. In the page, each image sits in a `.cut` box shaped like the unbaked piece (`--w`/`--h`), and the image spills out of it by that margin, so pieces stay exactly where they were. The readiness bar keeps its own glow and has no edge. The repository keeps only the sources: the deploy bakes into its staged copy of the site, and local bakes are git-ignored.

## Visit counting

`visit.js` counts page views for the admin dashboard without cookies or browser storage; see [the handoff](HANDOFF.md#website-visits). It is loaded by the landing, privacy and terms pages, so add it to any new public page.

## Localization

The landing page supports English and German without a runtime dependency. An explicit `?lang=en` or `?lang=de` choice wins, followed by the saved preference and then the browser's primary language; all other languages fall back to English. The language switch updates the page copy, accessibility labels, social metadata, structured data, canonical URL, credits page, and web app manifest.
