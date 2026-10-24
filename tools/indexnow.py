#!/usr/bin/env python3
"""Tells the search engines that use IndexNow which of the site's addresses a deploy changed, so they fetch
them again instead of waiting to recrawl: Bing (whose index ChatGPT search, Copilot and DuckDuckGo use),
Yandex, Seznam, Naver and Yep. Google doesn't take IndexNow; it reads the sitemap.

The deploy workflow passes the repository files the push changed. Each maps to the addresses whose words it
holds: a page's HTML and the script its words come from, each with the page's German address (PAGES in
tools/language_pages.py), and the llms files. Styles, images and tools change no words and send nothing,
except tools/language_pages.py, which makes every German page. With --all, which the workflow passes when it
can't tell what changed (a manual run), every address goes.

The key is public by design: IndexNow checks it at https://joinakari.com/<KEY>.txt, which is site/<KEY>.txt.
To change it, write a new key file, delete the old one and change KEY below.

Usage: python3 tools/indexnow.py [--all] [--dry-run] [FILE ...]
No dependencies.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from language_pages import PAGES

SITE = "https://joinakari.com"
KEY = "f790e2a7d85fa5f7bb1c6224381eed9a"
ENDPOINT = "https://api.indexnow.org/indexnow"
REPOSITORY = Path(__file__).resolve().parent.parent

# Each file that holds a page's words, and the English addresses of those pages.
LEGAL_PAGES = ["/privacy/", "/terms/", "/brand/", "/about-us/"]
PAGE_SOURCES = {
    "site/index.html": ["/"],
    "site/script.js": ["/"],
    "site/privacy/index.html": ["/privacy/"],
    "site/terms/index.html": ["/terms/"],
    "site/brand/index.html": ["/brand/"],
    "site/about-us/index.html": ["/about-us/"],
    "site/legal.js": LEGAL_PAGES,
}
# Files that are addresses of their own.
FILES = {"site/llms.txt": "/llms.txt", "site/llms-full.txt": "/llms-full.txt"}


def changed_addresses(files):
    paths = []
    for file in files:
        for english in PAGE_SOURCES.get(file, []):
            paths += [english, PAGES[english]]
        if file in FILES:
            paths.append(FILES[file])
        if file == "tools/language_pages.py":
            paths += PAGES.values()
    return [SITE + path for path in dict.fromkeys(paths)]


def every_address():
    paths = [path for english in PAGES for path in (english, PAGES[english])] + list(FILES.values())
    return [SITE + path for path in paths]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("files", nargs="*", help="repository files the deploy changed")
    parser.add_argument("--all", action="store_true", help="send every address")
    parser.add_argument("--dry-run", action="store_true", help="print the addresses without sending them")
    arguments = parser.parse_args()

    key_file = REPOSITORY / "site" / f"{KEY}.txt"
    if not key_file.is_file() or key_file.read_text().strip() != KEY:
        print(f"indexnow: site/{KEY}.txt must hold the key", file=sys.stderr)
        return 1
    urls = every_address() if arguments.all else changed_addresses(arguments.files)
    if not urls:
        print("indexnow: no page's words changed, so nothing to send.")
        return 0
    print("\n".join(urls))
    if arguments.dry_run:
        return 0

    body = json.dumps({"host": SITE.removeprefix("https://"), "key": KEY, "keyLocation": f"{SITE}/{KEY}.txt", "urlList": urls})
    request = urllib.request.Request(ENDPOINT, data=body.encode(), headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            # 200 is taken; 202 is taken while IndexNow still checks the key file, as on the first send.
            print(f"indexnow: sent {len(urls)} addresses ({response.status})")
            return 0
    except urllib.error.HTTPError as error:
        print(f"indexnow: {error.code} {error.reason}: {error.read().decode(errors='replace')[:300]}", file=sys.stderr)
        return 1
    except urllib.error.URLError as error:
        print(f"indexnow: can't reach {ENDPOINT} ({error.reason})", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
