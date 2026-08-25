# Akari website

A lightweight static website for Akari, deployed to [joinakari.com](https://joinakari.com/). It is intentionally dependency-free and can run locally or on any static host.

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

The visual assets in `health/assets` are copied from the local Akari iOS project and remain product-reference material. The public TestFlight URL is referenced directly in `index.html`, `llms.txt`, and `llms-full.txt`.

## Localization

The landing page supports English and German without a runtime dependency. An explicit `?lang=en` or `?lang=de` choice wins, followed by the saved preference and then the browser's primary language; all other languages fall back to English. The language switch updates the page copy, accessibility labels, social metadata, structured data, canonical URL, credits page, and web app manifest.
