#!/usr/bin/env python3
"""Bakes the cream die-cut edge and the drop shadow into the landing page's pieces and stickers.

The page used to draw both at runtime with an SVG filter (a 3px dilate filled with the theme's cream)
and a CSS drop-shadow. That filter was rasterised per image and on iPhone filled in visibly while
scrolling, so this script draws the same thing into the files instead:

- every piece in assets/welcome/<theme>/<lang>/<mode>/<piece>@2x|3x.webp, except the readiness bar,
  which carries its own glow and has no edge, into <piece>-cut@2x|3x.webp beside it;
- each theme's app icon, assets/welcome/<theme>/app-icon-<mode>@2x|3x.webp, into app-icon-<mode>-cut;
- the Apple Health icon, assets/welcome/apple-health@2x|3x.webp, into assets/welcome/<theme>/apple-health-cut;
- the food stickers, assets/welcome/stickers/<name>.webp, into assets/welcome/stickers/<theme>/;
- the Fluent stickers (lock, goals, focuses), assets/stickers/<name>.png, into assets/stickers/<theme>/.

A sticker has no 1x size of its own: the page shows it anywhere from about 50 to 180px wide, and the old
filter drew a 3px edge at every one of those sizes. So each sticker is baked at a ladder of widths,
<name>-<width>@2x|3x.webp, and the page takes the one nearest the width it shows it at (cutImageBase in
script.js), which keeps the edge within about 13 % of 3px.

Each output is the input on a transparent margin of SIDE px left and right, TOP above and BOTTOM below
(at 1x; twice that in a 2x file, three times in a 3x), so the shadow is never clipped. styles.css
(.cut__image) reads the same numbers to place the inner piece exactly where the unbaked one was.

Usage: python3 tools/bake_die_cuts.py [--root DIR] [--jobs N] [--stickers NAME ... --out DIR]
Reads and writes under DIR, the repository by default; the deploy workflow passes its staged site/.
With --stickers, bakes only those Fluent stickers, into <out>/<theme>/: the admin dashboard is served
by the feedback worker, which keeps its own committed copies (pnpm bake in feedback-worker/).
An output newer than its input and than this script is left alone, so a second run does nothing.
Needs Pillow (pip install pillow).
"""

from __future__ import annotations

import argparse
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

# --band-ink in styles.css, the cream each theme's edge is drawn in.
CREAM = {
    "forest": (0xF8, 0xEB, 0xBC),
    "meadow": (0xFF, 0xF1, 0xC9),
    "coast": (0xE3, 0xE6, 0xFF),
    "canyon": (0xFF, 0xEC, 0xD4),
    "plain": (0xFF, 0xFF, 0xFF),
}
THEMES = tuple(CREAM)
SCALES = (2, 3)

# At 1x, in CSS pixels; keep in step with --cut-side, --cut-top and --cut-bottom in styles.css.
RING = 3  # the dilate radius of the old #die-cut filter
SHADOW_Y = 10  # drop-shadow(0 10px 14px rgba(0, 0, 0, 0.24))
SHADOW_SIGMA = 7  # a 14px blur radius is a Gaussian with half that standard deviation
SHADOW_ALPHA = 0.24
SIDE, TOP, BOTTOM = 20, 10, 30  # room for ring and shadow: the blur fades out within 17px

STICKER_SIZES = (56, 72, 92, 120, 160)  # each about 1.29 times the last; keep in step with script.js
NO_EDGE = {"readiness-bar"}
SCRIPT = Path(__file__).resolve()


def dilate(alpha: Image.Image, radius: int) -> Image.Image:
    """The square max filter feMorphology applies, as a row pass and a column pass of shifted maxima.
    The margin is wider than the radius, so the wrap-around of offset() only ever brings in transparency."""
    rows = alpha
    for dx in range(1, radius + 1):
        rows = ImageChops.lighter(rows, ImageChops.lighter(ImageChops.offset(alpha, dx, 0), ImageChops.offset(alpha, -dx, 0)))
    grown = rows
    for dy in range(1, radius + 1):
        grown = ImageChops.lighter(grown, ImageChops.lighter(ImageChops.offset(rows, 0, dy), ImageChops.offset(rows, 0, -dy)))
    return grown


def bake(source: Image.Image, cream: tuple[int, int, int], scale: int) -> Image.Image:
    source = source.convert("RGBA")
    width, height = source.size
    canvas = Image.new("RGBA", (width + 2 * SIDE * scale, height + (TOP + BOTTOM) * scale), (0, 0, 0, 0))
    canvas.paste(source, (SIDE * scale, TOP * scale))

    # The edge: the piece's own silhouette grown by the ring, in cream, under the piece.
    grown = dilate(canvas.getchannel("A"), RING * scale)
    edge = Image.new("RGBA", canvas.size, cream + (0,))
    edge.putalpha(grown)
    piece = Image.alpha_composite(edge, canvas)

    # The shadow of piece and edge together, blurred, faded and moved down, under both.
    blurred = piece.getchannel("A").filter(ImageFilter.GaussianBlur(SHADOW_SIGMA * scale))
    blurred = blurred.point(lambda value: round(value * SHADOW_ALPHA))
    blurred = ImageChops.offset(blurred, 0, SHADOW_Y * scale)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow.putalpha(blurred)
    return Image.alpha_composite(shadow, piece)


def sticker_source(path: Path, size: int, scale: int) -> Image.Image:
    """A sticker scaled to its baked width, resampled with premultiplied alpha so its rim stays clean."""
    image = Image.open(path).convert("RGBA")
    target = size * scale
    if image.size != (target, target):
        image = image.convert("RGBa").resize((target, target), Image.Resampling.LANCZOS).convert("RGBA")
    return image


def sticker_jobs(source: Path, out: Path):
    for theme in THEMES:
        for size in STICKER_SIZES:
            for scale in SCALES:
                yield source, out / theme / f"{source.stem}-{size}@{scale}x.webp", theme, scale, size


def jobs(root: Path):
    """(source, output, theme, scale, sticker size or None) for every baked file."""
    welcome = root / "assets" / "welcome"
    for theme in THEMES:
        theme_dir = welcome / theme
        for scale in SCALES:
            for source in sorted(theme_dir.glob(f"*/*/*@{scale}x.webp")):
                name = source.name.removesuffix(f"@{scale}x.webp")
                if name in NO_EDGE or name.endswith("-cut"):
                    continue
                yield source, source.with_name(f"{name}-cut@{scale}x.webp"), theme, scale, None
            for source in sorted(theme_dir.glob(f"app-icon-*@{scale}x.webp")):
                name = source.name.removesuffix(f"@{scale}x.webp")
                if name.endswith("-cut"):
                    continue
                yield source, theme_dir / f"{name}-cut@{scale}x.webp", theme, scale, None
            health = welcome / f"apple-health@{scale}x.webp"
            if health.exists():
                yield health, theme_dir / f"apple-health-cut@{scale}x.webp", theme, scale, None
        for folder, pattern in ((welcome / "stickers", "*.webp"), (root / "assets" / "stickers", "*.png")):
            for source in sorted(folder.glob(pattern)):
                for size in STICKER_SIZES:
                    for scale in SCALES:
                        yield source, folder / theme / f"{source.stem}-{size}@{scale}x.webp", theme, scale, size


def is_current(source: Path, output: Path) -> bool:
    if not output.exists():
        return False
    built = output.stat().st_mtime
    return built > source.stat().st_mtime and built > SCRIPT.stat().st_mtime


def run(job) -> str:
    source, output, theme, scale, sticker_size = job
    image = sticker_source(source, sticker_size, scale) if sticker_size else Image.open(source)
    baked = bake(image, CREAM[theme], scale)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.name}.tmp")
    baked.save(temporary, "WEBP", lossless=True, quality=100, method=4, exact=False)
    os.replace(temporary, output)
    return str(output)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, default=SCRIPT.parent.parent, help="folder holding assets/ (default: the repository)")
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 1, help="images baked in parallel")
    parser.add_argument("--stickers", nargs="+", metavar="NAME", help="bake only these assets/stickers/<name>.png")
    parser.add_argument("--out", type=Path, help="with --stickers: the folder their theme folders go in")
    args = parser.parse_args()
    root = args.root.resolve()
    if args.stickers:
        if not args.out:
            parser.error("--stickers needs --out")
        sources = [root / "assets" / "stickers" / f"{name}.png" for name in args.stickers]
        missing = [str(source) for source in sources if not source.exists()]
        if missing:
            print(f"No such sticker: {', '.join(missing)}", file=sys.stderr)
            return 1
        out = args.out.resolve()
        every = [job for source in sources for job in sticker_jobs(source, out)]
    elif (root / "assets" / "welcome").is_dir():
        every = list(jobs(root))
    else:
        print(f"No assets/welcome under {root}", file=sys.stderr)
        return 1

    pending = [job for job in every if not is_current(job[0], job[1])]
    total = len(every)
    if not pending:
        print(f"All {total} baked images are up to date.")
        return 0
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        for done, _ in enumerate(pool.map(run, pending, chunksize=4), start=1):
            if done % 100 == 0 or done == len(pending):
                print(f"Baked {done} of {len(pending)}", flush=True)
    print(f"Baked {len(pending)} images; {total - len(pending)} were up to date.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
