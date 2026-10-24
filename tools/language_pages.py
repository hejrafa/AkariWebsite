#!/usr/bin/env python3
"""Gives every page its own German address: /de/ for the landing page, /de/datenschutz/, /de/nutzungsbedingungen/,
/de/marke/ and /de/ueber-uns/ for privacy, terms, brand and about us, while the English pages stay at /, /privacy/,
/terms/, /brand/ and /about-us/.

GitHub Pages only serves files, so each German address is a copy of its English page that is German in the
file itself: its <html lang>, the canonical address, the title, description and sharing cards, the links between
pages, and every word the language switch would change (each data-i18n, data-i18n-html, data-i18n-aria-label
and data-i18n-alt), so search engines and AI crawlers that don't run scripts read German too. The landing page's
structured data is structuredDataFor("de") from script.js itself, run by Node. The page's script writes the
same words again on load. Only the English pages are kept in the repository; the copies are made from them
every time, so the two can't drift apart.

404.html is not one of these pages. GitHub Pages serves the root 404.html for every missing address, under
/de/ too, so there is one file and no /de/404/; its own script picks the language from the address. build
leaves it where it is, and serve answers a missing address with it, as GitHub Pages does.

The German words are read from the scripts that hold them already: pageMetadata and translations in script.js
for the landing page, and pageMetadata, commonTranslations and pageTranslations in legal.js for the others. A
string that can't be found stops the build rather than leaving English on a German page.

Usage:
  python3 tools/language_pages.py build --root DIR   writes the German pages into DIR, a staged copy of the site
                                                     (the deploy workflow passes its staged copy)
  python3 tools/language_pages.py serve [PORT]       serves site/ on 127.0.0.1:PORT (8000 by default),
                                                     making each German page from its English one as it's asked for
Needs Node for the landing page's structured data, and nothing else.
"""

import argparse
import html
import http.server
import json
import re
import subprocess
import sys
import textwrap
from functools import partial
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://joinakari.com"
SITE_ROOT = Path(__file__).resolve().parent.parent / "site"

# Each English address and its German one. script.js and legal.js keep the same table (languagePaths).
PAGES = {
    "/": "/de/",
    "/privacy/": "/de/datenschutz/",
    "/terms/": "/de/nutzungsbedingungen/",
    "/brand/": "/de/marke/",
    "/about-us/": "/de/ueber-uns/",
}


def page_file(root, path):
    return root / path.strip("/") / "index.html"


# Reading strings out of the scripts ----------------------------------------------------------------------

def object_after(source, name):
    """The text of the {...} object literal given to name (`name: {`, `"name": {` or `const name = {`)."""
    match = re.search(rf"(?:\"{re.escape(name)}\"|(?<![\w$]){re.escape(name)})\s*[:=]\s*\{{", source)
    if not match:
        raise SystemExit(f"language_pages: can't find {name}")
    return balanced(source, match.end() - 1, name)


def function_source(source, name):
    """The text of the top-level `function name(...) {...}`."""
    match = re.search(rf"^function {re.escape(name)}\([^)]*\)\s*\{{", source, re.M)
    if not match:
        raise SystemExit(f"language_pages: can't find function {name}")
    return source[match.start():match.end() - 1] + balanced(source, match.end() - 1, name)


def balanced(source, start, name):
    """The text from the { at start to the } that closes it, skipping over strings, template literals and
    comments."""
    depth, index, quote = 0, start, None
    while index < len(source):
        character = source[index]
        if quote:
            if character == "\\":
                index += 1
            elif character == quote:
                quote = None
        elif character in "\"'`":
            quote = character
        elif source.startswith("//", index):
            index = source.find("\n", index)
            if index < 0:
                break
        elif source.startswith("/*", index):
            index = source.find("*/", index) + 1
            if index <= 0:
                break
        elif character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                return source[start:index + 1]
        index += 1
    raise SystemExit(f"language_pages: {name} never closes")


def strings_in(block, where):
    """An object literal of strings, one `key: "value",` to a line, as a dict."""
    strings = {}
    for line in block.strip()[1:-1].splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        match = re.fullmatch(r'(["\']?)([\w$-]+)\1:\s*("(?:[^"\\]|\\.)*"),?', line)
        if not match:
            raise SystemExit(f"language_pages: can't read this line of {where}: {line[:80]}")
        strings[match.group(2)] = json.loads(match.group(3))
    return strings


def german_words(root, path):
    """Every German string the page's script writes into it, by key, and where they come from."""
    if path == "/":
        source = (root / "script.js").read_text(encoding="utf-8")
        where = "script.js translations.de"
        return strings_in(object_after(object_after(source, "translations"), "de"), where), where
    source = (root / "legal.js").read_text(encoding="utf-8")
    page = path.strip("/")
    common = strings_in(object_after(object_after(source, "commonTranslations"), "de"), "legal.js commonTranslations.de")
    where = f"legal.js pageTranslations.{page}.de"
    own = strings_in(object_after(object_after(object_after(source, "pageTranslations"), page), "de"), where)
    return {**common, **own}, f"legal.js commonTranslations.de or {where}"


def german_structured_data(root):
    """The landing page's structured data in German: structuredDataFor("de") from script.js itself, run by Node,
    so it is exactly what the page's script writes."""
    source = (root / "script.js").read_text(encoding="utf-8")
    program = "\n".join([
        f"const languagePaths = {object_after(source, 'languagePaths')};",
        f"const translations = {object_after(source, 'translations')};",
        f"const pageMetadata = {object_after(source, 'pageMetadata')};",
        function_source(source, "pathFor"),
        function_source(source, "structuredDataFor"),
        'process.stdout.write(JSON.stringify(structuredDataFor("de"), null, 2));',
    ])
    try:
        result = subprocess.run(["node", "-"], input=program, capture_output=True, text=True, check=True)
    except FileNotFoundError:
        raise SystemExit("language_pages: the landing page's structured data needs Node (node on the PATH)")
    except subprocess.CalledProcessError as error:
        raise SystemExit(f"language_pages: structuredDataFor failed:\n{error.stderr}")
    return result.stdout


def string_value(block, key, where):
    match = re.search(rf'(?<![\w$]){re.escape(key)}:\s*("(?:[^"\\]|\\.)*")', block)
    if not match:
        raise SystemExit(f"language_pages: no {key} in {where}")
    return json.loads(match.group(1))


def german_metadata(root, path):
    """The German title, description, sharing title and description, and image text for a page."""
    if path == "/":
        source = (root / "script.js").read_text(encoding="utf-8")
        copy = object_after(object_after(source, "pageMetadata"), "de")
        where = "script.js pageMetadata.de"
        return {
            "title": string_value(copy, "title", where),
            "description": string_value(copy, "description", where),
            "socialTitle": string_value(copy, "socialTitle", where),
            "socialDescription": string_value(copy, "socialDescription", where),
            "twitterDescription": string_value(copy, "twitterDescription", where),
            "imageAlt": string_value(copy, "imageAlt", where),
            "keywords": string_value(copy, "keywords", where),
        }
    source = (root / "legal.js").read_text(encoding="utf-8")
    page = path.strip("/")
    copy = object_after(object_after(object_after(source, "pageMetadata"), page), "de")
    common = object_after(object_after(source, "commonTranslations"), "de")
    where = f"legal.js pageMetadata.{page}.de"
    title = string_value(copy, "title", where)
    description = string_value(copy, "description", where)
    return {
        "title": title,
        "description": description,
        "socialTitle": title,
        "socialDescription": description,
        "twitterDescription": description,
        "imageAlt": string_value(common, "imageAlt", "legal.js commonTranslations.de"),
    }


# Making a German page ------------------------------------------------------------------------------------

def replace_one(pattern, replacement, text, what):
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"language_pages: can't find {what}")
    return text


def set_meta(text, attribute, name, value):
    return replace_one(
        rf'(<meta\s+{attribute}="{re.escape(name)}"\s+content=")[^"]*(")',
        lambda match: match.group(1) + html.escape(value) + match.group(2),
        text,
        f'<meta {attribute}="{name}">',
    )


# What the language switch writes: an element's words (as text or as HTML) and two of its attributes.
WORDS = {"data-i18n": "text", "data-i18n-html": "html"}
LABELS = {"data-i18n-aria-label": "aria-label", "data-i18n-alt": "alt"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Translatable(HTMLParser):
    """Where the language switch writes in a page: the start tag of each element with a label to change,
    and the inside of each element whose words it changes."""

    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.line_starts = [0] + [match.end() for match in re.finditer("\n", text)]
        self.open = []  # (tag, (kind, key, where its inside starts) or None) for each open element
        self.tags = []  # (start, end, attributes) of each start tag with a label to change
        self.insides = []  # (start, end, kind, key) of each element whose words change

    def position(self):
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def start_tag(self, attributes):
        start = self.position()
        end = start + len(self.get_starttag_text())
        attributes = dict(attributes)
        if any(name in attributes for name in LABELS):
            self.tags.append((start, end, attributes))
        return end, attributes

    def handle_starttag(self, tag, attributes):
        end, attributes = self.start_tag(attributes)
        if tag in VOID:
            return
        words = next(((kind, attributes[name], end) for name, kind in WORDS.items() if name in attributes), None)
        self.open.append((tag, words))

    def handle_startendtag(self, tag, attributes):
        self.start_tag(attributes)

    def handle_endtag(self, tag):
        if all(open_tag != tag for open_tag, _ in self.open):
            return
        while True:
            open_tag, words = self.open.pop()
            if open_tag == tag:
                break
            if words:
                raise SystemExit(f"language_pages: <{open_tag}> with {words[1]} is never closed")
        if words:
            kind, key, inside = words
            self.insides.append((inside, self.position(), kind, key))


def translate(text, words, where):
    """The page with the words the language switch would write into it."""
    parser = Translatable(text)
    parser.feed(text)
    parser.close()
    keys = {key for *_, key in parser.insides}
    keys |= {attributes[name] for *_, attributes in parser.tags for name in LABELS if name in attributes}
    missing = sorted(keys - words.keys())
    if missing:
        raise SystemExit(f"language_pages: {where} has no {', '.join(missing)}")

    edits = []
    for start, end, kind, key in parser.insides:
        edits.append((start, end, words[key] if kind == "html" else html.escape(words[key], quote=False)))
    for start, end, attributes in parser.tags:
        tag = text[start:end]
        for name, target in LABELS.items():
            if name in attributes:
                value = html.escape(words[attributes[name]])
                tag, count = re.subn(rf'(\s{target}=")[^"]*(")', lambda match: match.group(1) + value + match.group(2), tag, count=1)
                if not count:
                    tag = re.sub(r"\s*/?>$", lambda match: f' {target}="{value}"{match.group(0)}', tag, count=1)
        edits.append((start, end, tag))

    # Words written into an element replace everything inside it, so an edit within one is dropped, as the
    # switch's own would be overwritten. The rest go in from the end, so each start is still where it was.
    kept = []
    for edit in sorted(edits):
        if not kept or edit[0] >= kept[-1][1]:
            kept.append(edit)
    for start, end, replacement in reversed(kept):
        text = text[:start] + replacement + text[end:]
    return text


def german_page(root, path):
    """The German page for an English address, made from the English page under root."""
    german = PAGES[path]
    text = page_file(root, path).read_text(encoding="utf-8")
    copy = german_metadata(root, path)

    def html_tag(match):
        tag = match.group(0).replace('lang="en"', 'lang="de"').replace('data-language="en"', 'data-language="de"')
        if 'lang="de"' not in tag:
            raise SystemExit(f"language_pages: {path} has no lang on <html>")
        return tag

    text = replace_one(r"<html\b[^>]*>", html_tag, text, "<html>")
    text = replace_one(r"<title>[^<]*</title>", lambda _: f"<title>{html.escape(copy['title'])}</title>", text, "<title>")
    text = replace_one(
        r'(<link rel="canonical" href=")[^"]*(")', lambda match: match.group(1) + SITE + german + match.group(2), text, "the canonical link"
    )
    text = set_meta(text, "name", "description", copy["description"])
    if "keywords" in copy:
        text = set_meta(text, "name", "keywords", copy["keywords"])
    text = set_meta(text, "property", "og:title", copy["socialTitle"])
    text = set_meta(text, "property", "og:description", copy["socialDescription"])
    text = set_meta(text, "property", "og:url", SITE + german)
    text = set_meta(text, "property", "og:locale", "de_DE")
    text = set_meta(text, "property", "og:locale:alternate", "en_US")
    text = set_meta(text, "property", "og:image:alt", copy["imageAlt"])
    text = set_meta(text, "name", "twitter:title", copy["socialTitle"])
    text = set_meta(text, "name", "twitter:description", copy["twitterDescription"])
    text = set_meta(text, "name", "twitter:image:alt", copy["imageAlt"])
    text = text.replace('<link rel="manifest" href="/manifest.webmanifest"', '<link rel="manifest" href="/manifest-de.webmanifest"')
    text = translate(text, *german_words(root, path))
    if path == "/":
        data = textwrap.indent(german_structured_data(root).replace("</", "<\\/"), "      ")
        text = replace_one(
            r'(<script id="structured-data" type="application/ld\+json">).*?(\n\s*</script>)',
            lambda match: f"{match.group(1)}\n{data}{match.group(2)}",
            text,
            "the structured data",
        )

    # Links to the pages, with or without a #section, go to their German addresses. Anything else under a
    # page, like /brand/akari-brand.zip, stays as it is.
    pages = "|".join(re.escape(english) for english in PAGES)
    text = re.sub(
        rf'href="({pages})(#[^"]*)?"',
        lambda match: f'href="{PAGES[match.group(1)]}{match.group(2) or ""}"',
        text,
    )
    return text


# Commands ------------------------------------------------------------------------------------------------

def build(root):
    for path, german in PAGES.items():
        target = page_file(root, german)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(german_page(root, path), encoding="utf-8")
        print(f"{german} from {path}")


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    """The repository as GitHub Pages serves it, with the German pages made on each request."""

    english_for = {german: english for english, german in PAGES.items()}

    def german_request(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path.endswith("/index.html"):
            path = path[: -len("index.html")]
        if path + "/" in self.english_for:
            return "redirect", path + "/"
        if path in self.english_for:
            return "page", self.english_for[path]
        return None, None

    def send_german(self, include_body):
        kind, value = self.german_request()
        if kind == "redirect":
            query = self.path[len(self.path.split("?", 1)[0]):]
            self.send_response(301)
            self.send_header("Location", value + query)
            self.end_headers()
            return True
        if kind == "page":
            body = german_page(SITE_ROOT, value).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if include_body:
                self.wfile.write(body)
            return True
        return False

    def do_GET(self):
        if not self.send_german(True):
            super().do_GET()

    def do_HEAD(self):
        if not self.send_german(False):
            super().do_HEAD()

    def send_error(self, code, message=None, explain=None):
        # A missing address gets the site's own 404.html with a 404, as on GitHub Pages.
        not_found = SITE_ROOT / "404.html"
        if code != 404 or not not_found.is_file():
            super().send_error(code, message, explain)
            return
        body = not_found.read_bytes()
        self.send_response(404, message)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


def serve(port):
    handler = partial(PreviewHandler, directory=str(SITE_ROOT))
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError as error:
        raise SystemExit(
            f"language_pages: can't serve on port {port} ({error.strerror}). Another server is probably using it: "
            f"stop that one (lsof -i :{port} shows it), or pass another port, like serve {port + 1}."
        )
    with server:
        print(f"Serving the site on http://127.0.0.1:{port}/, German pages under /de/", flush=True)
        server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    build_command = commands.add_parser("build", help="write the German pages into a staged site")
    build_command.add_argument("--root", type=Path, required=True)
    serve_command = commands.add_parser("serve", help="serve the repository for local preview")
    serve_command.add_argument("port", type=int, nargs="?", default=8000)
    arguments = parser.parse_args()
    if arguments.command == "build":
        build(arguments.root.resolve())
    else:
        serve(arguments.port)


if __name__ == "__main__":
    sys.exit(main())
