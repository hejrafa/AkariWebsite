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

The site's type and colours follow the app: New York, and the per-theme page, card, ink, accent and launch-screen colours from the iOS project's `AppTheme.swift`. The per-theme app icons in `assets/app-icons/`, the Apple Health icon and the food stickers in `assets/stickers/` (Microsoft Fluent Emoji, MIT, licence alongside) come from the local Akari iOS project; `lock.png`, the goal stickers `goal-*.png` (chosen to match the app's goal icons in `Goal.swift`) and the focus stickers `focus-*.png` were taken from the same Fluent Emoji revision the app pins (`1ffb34c`), except `goal-eat.png`, `focus-hydrate.png`, `focus-eat.png` and `focus-protein.png`, which are the app's own food artwork. The goal tiles' titles and lines are the app's own focus strings in both languages; the tiles, cards, bar and rows on the landing page are the app's own renders in `assets/welcome/<en|de>/<dark|light>/<piece>@3x.png` (with its stickers in `assets/welcome/stickers/`). They are shown at their 1x size, never edited, and swapped to follow the language and light/dark switches; only the Japan (forest) theme is exported, so the other themes show the same pieces. Only the public files are deployed; the allowlist is in `.github/workflows/pages.yml`. The public TestFlight URL is referenced directly in `index.html`, `llms.txt`, and `llms-full.txt`.

## Localization

The landing page supports English and German without a runtime dependency. An explicit `?lang=en` or `?lang=de` choice wins, followed by the saved preference and then the browser's primary language; all other languages fall back to English. The language switch updates the page copy, accessibility labels, social metadata, structured data, canonical URL, credits page, and web app manifest.
