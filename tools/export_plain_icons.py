#!/usr/bin/env python3
"""Exports the plain app icon (the logo on black, the app's Plain theme in dark) for search and sharing.

Writes into site/assets/icons/:
- icon-1024.png, icon-512.png, icon-192.png: the icon as iOS draws it, rounded, with transparent corners
  (the web app manifest's "any" icons; the 512 is also the logo in the page's structured data);
- apple-touch-icon-180.png and icon-48.png: opaque squares, for iOS to round itself and for Google's
  result favicon, which it crops on its own;
- icon-maskable-512.png: an opaque square whose mark stays inside the central 80 % circle.
And site/favicon.ico, the 48 px square at 16, 32 and 48 px, for anything that asks for /favicon.ico.
The sharing card, site/assets/social.png, is drawn by tools/export_logos.py from the logo.

Each size is rendered by Icon Composer's ictool from the app's AppIcon.icon, Dark rendition, exactly
as the app's Scripts/export_welcome_assets.sh renders icons, then matched to sRGB with sips.

Usage: python3 tools/export_plain_icons.py [--app ../App]
Needs macOS with Xcode and Pillow.
"""

from __future__ import annotations

import argparse
import math
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICTOOL = "/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"
SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"


def render(document: Path, size: int, work: Path) -> Image.Image:
    """The icon at size x size, 8-bit sRGB with alpha."""
    raw = work / f"icon-{size}.png"
    subprocess.run(
        [ICTOOL, str(document), "--export-image", "--output-file", str(raw), "--platform", "iOS",
         "--rendition", "Dark", "--width", str(size), "--height", str(size), "--scale", "1"],
        check=True, stdout=subprocess.DEVNULL,
    )
    # ictool writes 16-bit Display P3; the web wants 8-bit sRGB.
    subprocess.run(["sips", "--matchTo", SRGB, str(raw)], check=True, stdout=subprocess.DEVNULL)
    return Image.open(raw).convert("RGBA")


def square(icon: Image.Image) -> Image.Image:
    """An opaque square: the rendered icon has transparent corners and a light rim along its rounded edge,
    so near the edges its own dark ground takes over, fully within 8 % of the width from an edge and
    blending to the render by 12 % (as the app's export does with the painted themes' photos). The ground
    follows the icon's own top-to-bottom shading, read just inside the rim."""
    width, height = icon.size
    pixels = icon.load()
    sample_x = (round(width * 0.13), round(width * 0.87) - 1)
    ground = []
    for y in range(height):
        row = min(max(y, round(height * 0.13)), round(height * 0.87) - 1)
        left, right = pixels[sample_x[0], row], pixels[sample_x[1], row]
        ground.append(tuple((left[c] + right[c]) // 2 for c in range(3)))
    out = Image.new("RGB", icon.size)
    target = out.load()
    for y in range(height):
        for x in range(width):
            edge = min(x, y, width - 1 - x, height - 1 - y) / width
            weight = min(max((edge - 0.08) / 0.04, 0), 1)
            r, g, b, a = pixels[x, y]
            alpha = a / 255 * weight
            target[x, y] = tuple(round(ground[y][c] * (1 - alpha) + (r, g, b)[c] * alpha) for c in range(3))
    return out


def mark_radius(icon: Image.Image) -> float:
    """How far from the centre the orange mark reaches, as a share of the width."""
    width, height = icon.size
    pixels = icon.load()
    furthest = 0.0
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 200 and r > 150 and r - b > 90:
                furthest = max(furthest, math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2))
    return furthest / width


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--app", type=Path, default=ROOT.parent / "App", help="the app repository (default: ../App)")
    args = parser.parse_args()
    document = args.app / "Akari" / "AppIcon.icon"
    if not document.exists():
        print(f"No {document}", file=sys.stderr)
        return 1
    icons = ROOT / "site" / "assets" / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        work = Path(temporary)
        for size in (1024, 512, 192):
            render(document, size, work).save(icons / f"icon-{size}.png", optimize=True)
        square(render(document, 180, work)).save(icons / "apple-touch-icon-180.png", optimize=True)
        favicon = square(render(document, 48, work))
        favicon.save(icons / "icon-48.png", optimize=True)
        favicon.save(ROOT / "site" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
        maskable = render(document, 512, work)
        radius = mark_radius(maskable)
        if radius > 0.4:
            print(f"The mark reaches {radius:.0%} from the centre, outside the maskable safe zone (40 %).", file=sys.stderr)
            return 1
        square(maskable).save(icons / "icon-maskable-512.png", optimize=True)
    print(f"Wrote 6 icons to {icons} and site/favicon.ico (mark within {radius:.0%} of the centre)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
