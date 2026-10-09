# Akari website

A lightweight static website for Akari, deployed to [joinakari.com](https://joinakari.com/). It is intentionally dependency-free and can run locally or on any static host.

The admin dashboard and food-feedback API are in `feedback-worker/`. See [the maintainer handoff](HANDOFF.md) for access, local development, admin accounts, and deployment instructions for both parts.

## Run locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Discovery files

- `robots.txt` allows search and AI search crawlers and references the sitemap.
- `sitemap.xml` lists the canonical public page and its primary images.
- `llms.txt` and `llms-full.txt` provide concise machine-readable product information.
- `manifest.webmanifest` describes the website for browsers and installed shortcuts.
- The page includes Open Graph, X/Twitter, canonical, and `SoftwareApplication` JSON-LD metadata.

The site's type and colours follow the app: New York, and the per-theme page, card, ink, accent and launch-screen colours from the iOS project's `AppTheme.swift`. Five themes are offered: Wasserkuppe (`meadow`), Shiratani (`forest`, the default), Loch Tay (`coast`), Green River Overlook (`canyon`) and Plain (`plain`). Plain has no painting, so its deep band is the app's dark card colour and its logo mark uses the app's yellow-to-orange launch gradient (`assets/logo/akari-logo-plain-*.svg`). The app exports everything the landing page shows into `assets/welcome/`: each piece per theme, language and light/dark rendering (`<theme>/<en|de>/<dark|light>/<piece>@2x.webp`, `@3x.webp` and a `@3x.png` source), the app icon per theme (`<theme>/app-icon-<light|dark>`, dark only for Plain), the Apple Health icon and the food stickers in `stickers/`. The page shows each piece at its 1x size, never edited, picks 2x or 3x by screen density, and swaps with the theme, language and light/dark switches. The other stickers in `assets/stickers/` (lock, the goal and focus stickers chosen to match the app's icons in `Goal.swift`) are Microsoft Fluent Emoji (MIT, licence alongside) from the revision the app pins (`1ffb34c`). The goal tiles' titles and lines are the app's own focus strings in both languages. Only the public files are deployed; the allowlist is in `.github/workflows/pages.yml`. The public TestFlight URL is referenced directly in `index.html`, `llms.txt`, and `llms-full.txt`.

## Localization

The landing page supports English and German without a runtime dependency. An explicit `?lang=en` or `?lang=de` choice wins, followed by the saved preference and then the browser's primary language; all other languages fall back to English. The language switch updates the page copy, accessibility labels, social metadata, structured data, canonical URL, credits page, and web app manifest.
