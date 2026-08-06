# Akari launch site

A lightweight static launch site for Akari. It is intentionally dependency-free, so it can be opened locally or deployed to any static host.

## Run locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` for the Akari placeholder or `http://localhost:8000/health/` for the health landing page in progress.

## Launch settings

- Add the public TestFlight invitation URL in `script.js` as `TESTFLIGHT_URL`. All main access buttons will automatically become “Join the TestFlight beta” links.
- Until the beta link is ready, the early-access form captures submissions when deployed on Netlify (it uses Netlify Forms and needs no extra code). For another host, wire the form to your preferred email provider.

The visual assets in `health/assets` are copied from the local Akari Health iOS project and remain product-reference material.
