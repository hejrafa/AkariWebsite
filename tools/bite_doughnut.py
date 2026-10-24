#!/usr/bin/env python3
"""Takes bites out of the Fluent doughnut for the 404 page's zero.

Reads site/assets/stickers/doughnut.png (Fluent Emoji's 3D doughnut, unchanged) and writes
doughnut-bitten-1.png, -2 and -3 beside it, each with one more bite than the last. A bite is a round
mouthful with tooth marks along its rim, and where it cuts in, the dough shows. tools/bake_die_cuts.py then
bakes them like any other sticker, so the die-cut edge follows the bites.

The page knows where each bite is, to throw its crumbs from there: doughnutBites in not-found.js holds BITES
below as fractions of the 256px picture. Change both together.

Usage: python3 tools/bite_doughnut.py     Needs Pillow (pip install pillow).
"""

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

STICKERS = Path(__file__).resolve().parent.parent / "site" / "assets" / "stickers"
SIZE = 256
SUPER = 4  # the bites are drawn this many times larger, then scaled down, for smooth edges

# (x, y, radius) of each mouthful in the 256px picture, in the order they're taken.
BITES = [(214, 42, 46), (240, 158, 44), (42, 56, 44)]
TEETH = 0.3  # each tooth mark's radius, as a share of the mouthful's
FACE = 9  # how deep the dough shows past the bite's edge, in px
DOUGH_LIGHT = (252, 228, 178)
DOUGH_DEEP = (231, 182, 118)


def mouthful(x, y, radius):
    """A bite's shape at SUPER scale: a disc with tooth marks, small discs centred on its rim, so the
    edge left behind is a row of scallops."""
    mask = Image.new("L", (SIZE * SUPER, SIZE * SUPER), 0)
    draw = ImageDraw.Draw(mask)
    cx, cy, r = x * SUPER, y * SUPER, radius * SUPER
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    tooth = r * TEETH
    count = max(6, round(2 * math.pi * r / (tooth * 1.75)))
    for index in range(count):
        angle = 2 * math.pi * index / count
        tx, ty = cx + r * math.cos(angle), cy + r * math.sin(angle)
        draw.ellipse((tx - tooth, ty - tooth, tx + tooth, ty + tooth), fill=255)
    return mask.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def grow(mask, steps):
    return mask.filter(ImageFilter.MaxFilter(2 * steps + 1))


def take_bites(doughnut, count):
    image = doughnut.copy()
    eaten = Image.new("L", (SIZE, SIZE), 0)
    for bite in BITES[:count]:
        eaten = ImageChops.lighter(eaten, mouthful(*bite))

    # The dough: a band just past the bites, light at the cut and deeper further in, with a darker line
    # where it meets the glaze and the crust.
    dough = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    for depth in range(FACE, 0, -1):
        mix = (depth - 1) / (FACE - 1)
        colour = tuple(round(light + (deep - light) * mix) for light, deep in zip(DOUGH_LIGHT, DOUGH_DEEP))
        ring = grow(eaten, depth).filter(ImageFilter.GaussianBlur(0.6))
        layer = Image.new("RGBA", (SIZE, SIZE), colour + (0,))
        layer.putalpha(ring)
        dough = Image.alpha_composite(dough, layer)
    edge = ImageChops.subtract(grow(eaten, FACE + 1), grow(eaten, FACE)).filter(ImageFilter.GaussianBlur(0.7))
    line = Image.new("RGBA", (SIZE, SIZE), (150, 92, 52, 0))
    line.putalpha(edge.point(lambda value: round(value * 0.45)))
    dough = Image.alpha_composite(line, dough)

    # Only where the doughnut was: the dough sits on it, and the bites take everything away.
    dough.putalpha(ImageChops.multiply(dough.getchannel("A"), image.getchannel("A")))
    image = Image.alpha_composite(image, dough)
    image.putalpha(ImageChops.multiply(image.getchannel("A"), ImageChops.invert(eaten)))
    return image


def main():
    doughnut = Image.open(STICKERS / "doughnut.png").convert("RGBA")
    for count in range(1, len(BITES) + 1):
        target = STICKERS / f"doughnut-bitten-{count}.png"
        take_bites(doughnut, count).save(target, optimize=True)
        print(target.relative_to(STICKERS.parents[2]))


if __name__ == "__main__":
    main()
