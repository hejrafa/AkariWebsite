#!/usr/bin/env python3
"""Writes the logos and the brand kit from the app's icons.

The header and footer logos, assets/logo/akari-logo-<theme>-<dark|light>.svg, are the mark from the theme's
app icon above the Akari wordmark. The mark is the icon's own layers from the app's AppIcon<Theme>.icon
(AppIcon.icon for Plain): the outline and inside arcs in the theme's gradient,
and the theme's touches (bolts, leaves, bubbles or drops). Each layer also carries a lavender copy of every
shape underneath the gradient one, for Icon Composer's other renditions; the logo keeps only the gradient
shapes. The wordmark comes from assets/akari-logo.svg, in the theme's cream on dark and its ink on light.

All logos keep the 89.2823 x 50 box the site, the admin dashboard and its login load them in, and share
one layout, so the arcs and the wordmark stay put when the theme changes. The touches reach above and
beside the arcs, so the mark is scaled until the widest reach of any theme's touches fits above the
wordmark.

The brand page's downloads go to assets/brand/, named after the themes as the site shows them:
- akari-logo-<theme>-on-<dark|light>.svg and .png (2000 px wide), the logos above;
- akari-mark-<theme>.svg and .png (1024 px wide), the mark alone;
- akari-app-icon-<theme>-<light|dark>.png, the app icon at 1024 px as iOS draws it, white or black tile,
  rendered by Icon Composer's ictool exactly as the app's Scripts/export_welcome_assets.sh does.
Last, it zips assets/brand/ into brand/akari-brand.zip for a local preview; the deploy makes its own.

Usage: python3 tools/export_logos.py [--app ../App] [--svg-only]
The PNGs need macOS with Xcode and Google Chrome; --svg-only writes just the SVGs.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
ICTOOL = "/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"

# Site theme key: its name in the brand kit's file names, the app's icon document, and the wordmark's
# colour on the deep band and on light pages.
THEMES = {
    "meadow": ("wasserkuppe", "AppIconMeadow.icon", "#F1EAC6", "#1D1B07"),
    "forest": ("shiratani", "AppIconForest.icon", "#E6F4D1", "#151A0C"),
    "coast": ("loch-tay", "AppIconCoast.icon", "#D7EDF8", "#0D1920"),
    "canyon": ("green-river-overlook", "AppIconCanyon.icon", "#F4DDD1", "#1A100C"),
    "plain": ("plain", "AppIcon.icon", "#FFFFFF", "#000000"),
}
# Stops of the lavender copies, which the logo leaves out.
LAVENDER = {"#F1EBFF", "#E3E6FF"}
CANVAS = 1024
WIDTH, HEIGHT = 89.2823, 50
# Where the mark sits: from the top of the box down to the old mark's foot, centred on the wordmark.
MARK_BOTTOM = 24.372
CENTRE_X = WIDTH / 2
LOGO_PNG_WIDTH = 2000
MARK_PNG_WIDTH = 1024
ICON_PNG_SIZE = 1024


def tag(element: ET.Element) -> str:
    return element.tag.split("}")[-1]


def layer(path: Path, prefix: str) -> tuple[list[ET.Element], list[ET.Element], float, float]:
    """The layer's gradient shapes and the gradients they use, with ids made unique, and its size."""
    root = ET.parse(path).getroot()
    width, height = float(root.get("width")), float(root.get("height"))
    gradients = {}
    for element in root.iter():
        if tag(element) in ("linearGradient", "radialGradient"):
            stops = {stop.get("stop-color", "").upper() for stop in element if tag(stop) == "stop"}
            if not stops & LAVENDER:
                gradients[element.get("id")] = element
    shapes = []
    for element in root:
        if tag(element) == "defs":
            continue
        used = re.fullmatch(r"url\(#(.+)\)", element.get("fill", ""))
        if used and used.group(1) in gradients:
            element.set("fill", f"url(#{prefix}-{used.group(1)})")
            shapes.append(element)
    for key, gradient in gradients.items():
        gradient.set("id", f"{prefix}-{key}")
    return shapes, list(gradients.values()), width, height


def group_offset(document: Path, layer_name: str) -> tuple[float, float]:
    """The translation Icon Composer gives the group holding this layer, in canvas points."""
    for group in json.loads((document / "icon.json").read_text())["groups"]:
        if any(item.get("image-name") == f"{layer_name}.svg" for item in group["layers"]):
            x, y = (group.get("position") or {}).get("translation-in-points", (0, 0))
            return x, y
    return 0, 0


def touch_reach(document: Path) -> tuple[float, float, float]:
    """How far the touches reach left, right and up on the canvas. Each touch is a unit shape scaled
    about its centre, or a circle, so its centre plus its scale or radius bounds it."""
    touches = document / "Assets/touches.svg"
    if not touches.exists():
        return CANVAS, 0, CANVAS
    left, right, top = CANVAS, 0.0, CANVAS
    for element in ET.parse(touches).getroot().iter():
        if tag(element) == "circle":
            x, y, r = (float(element.get(key)) for key in ("cx", "cy", "r"))
        elif tag(element) == "path" and element.get("transform"):
            transform = element.get("transform")
            x, y = (float(n) for n in re.search(r"translate\(([-\d.]+)[ ,]+([-\d.]+)\)", transform).groups())
            r = float(re.search(r"scale\(([-\d.]+)", transform).group(1))
        else:
            continue
        left, right, top = min(left, x - r), max(right, x + r), min(top, y - r)
    return left, right, top


def mark_layers(document: Path) -> tuple[list[ET.Element], list[ET.Element]]:
    """The mark's gradients and its layers, each a group placed on the icon's 1024-point canvas, bottom
    first. Icon Composer lists groups and layers top first, so the outline's wave runs in front of the
    inside arcs' ends; a layer over another in its group casts a soft shadow on it, clipped to it, as the
    icon's glass does, so the arcs read apart where they meet."""
    defs = [ET.fromstring(f'<filter xmlns="{SVG}" id="lift" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7" /></filter>')]
    groups = []
    for icon_group in reversed(json.loads((document / "icon.json").read_text())["groups"]):
        below: list[ET.Element] = []
        for item in reversed(icon_group["layers"]):
            name = item["image-name"].removesuffix(".svg")
            path = document / "Assets" / item["image-name"]
            if not path.exists():
                continue
            shapes, gradients, width, height = layer(path, name)
            x, y = group_offset(document, name)
            place = f"translate({(CANVAS - width) / 2 + x:g} {(CANVAS - height) / 2 + y:g})"
            if below:
                clip = ET.Element("clipPath", {"id": f"under-{name}"})
                clip.extend(below)
                defs.append(clip)
                shadow = ET.Element("g", {"clip-path": f"url(#under-{name})"})
                cast = ET.SubElement(shadow, "g", {"filter": "url(#lift)", "fill-opacity": "0.32", "transform": f"translate(0 5) {place}"})
                for shape in shapes:
                    copy = ET.fromstring(ET.tostring(shape))
                    copy.set("fill", "#000")
                    cast.append(copy)
                groups.append(shadow)
            group = ET.Element("g", {"id": name, "transform": place})
            group.extend(shapes)
            groups.append(group)
            defs.extend(gradients)
            for shape in shapes:
                outline = ET.fromstring(ET.tostring(shape))
                outline.attrib.pop("fill", None)
                outline.set("transform", f"{place} {shape.get('transform', '')}".strip())
                below.append(outline)
    return defs, groups


def wordmark() -> ET.Element:
    """The wordmark, which assets/akari-logo.svg keeps hidden (it shows only the mark)."""
    root = ET.parse(ROOT / "assets/akari-logo.svg").getroot()
    word = next(element for element in root.iter() if element.get("id") == "akari-wordmark")
    word.attrib.pop("display", None)
    return word


def svg_root(width: float, height: float, view_box: str, logo: bool) -> ET.Element:
    attributes = {"width": f"{width:g}", "height": f"{height:g}", "viewBox": view_box, "fill": "none"}
    if logo:
        # As the logos were drawn before, so they drop into the same <img> boxes.
        attributes = {"preserveAspectRatio": "none", "overflow": "visible", "style": "display: block;", **attributes}
    return ET.Element("svg", attributes)


def write_svg(svg: ET.Element, out: Path) -> str:
    ET.indent(svg, space="")
    text = ET.tostring(svg, encoding="unicode") + "\n"
    out.write_text(text)
    print(f"Wrote {out.relative_to(ROOT)}")
    return text


def render_svg(text: str, width: int, height: int, out: Path, work: Path) -> None:
    """The SVG at width x height on a transparent ground, drawn by headless Chrome."""
    page = work / "render.html"
    page.write_text(f"""<!doctype html><meta charset="utf-8">
<style>html, body {{ margin: 0; background: transparent; }} svg {{ display: block; width: {width}px; height: {height}px; }}</style>
{text}""")
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--default-background-color=00000000", f"--window-size={width},{height}", f"--screenshot={out}",
         "--virtual-time-budget=2000", page.as_uri()],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    print(f"Wrote {out.relative_to(ROOT)}")


def render_icon(document: Path, rendition: str, out: Path) -> None:
    """The app icon as iOS draws it, rounded, 8-bit sRGB."""
    subprocess.run(
        [ICTOOL, str(document), "--export-image", "--output-file", str(out), "--platform", "iOS",
         "--rendition", rendition, "--width", str(ICON_PNG_SIZE), "--height", str(ICON_PNG_SIZE), "--scale", "1"],
        check=True, stdout=subprocess.DEVNULL,
    )
    subprocess.run(["sips", "--matchTo", SRGB, str(out)], check=True, stdout=subprocess.DEVNULL)
    print(f"Wrote {out.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--app", type=Path, default=ROOT.parent / "App", help="the iOS project (default: ../App)")
    parser.add_argument("--svg-only", action="store_true", help="write only the SVGs, without Chrome or Xcode")
    arguments = parser.parse_args()
    app = arguments.app / "Akari"
    documents = {theme: app / values[1] for theme, values in THEMES.items()}
    missing = [str(path) for path in documents.values() if not path.exists()]
    if not arguments.svg_only:
        missing += [tool for tool in (ICTOOL, CHROME) if not Path(tool).exists()]
    if missing:
        print("Missing:\n  " + "\n  ".join(missing), file=sys.stderr)
        return 1

    # One layout for every theme: the arcs' box on the canvas, grown by the furthest any theme's
    # touches reach, fitted between the top of the logo and the mark's foot.
    _, _, outline_width, outline_height = layer(documents["forest"] / "Assets/outline.svg", "o")
    dx, dy = group_offset(documents["forest"], "outline")
    arcs_left = (CANVAS - outline_width) / 2 + dx
    arcs_right = arcs_left + outline_width
    arcs_top = (CANVAS - outline_height) / 2 + dy
    arcs_bottom = arcs_top + outline_height
    reaches = {theme: touch_reach(document) for theme, document in documents.items()}
    reach_top = min([arcs_top] + [reach[2] for reach in reaches.values()])
    scale = MARK_BOTTOM / (arcs_bottom - reach_top)
    origin_x = CENTRE_X - (arcs_left + outline_width / 2) * scale
    origin_y = -reach_top * scale
    for theme, (left, right, _) in reaches.items():
        if origin_x + min(left, arcs_left) * scale < 0 or origin_x + max(right, arcs_right) * scale > WIDTH:
            print(f"{documents[theme].name}: the touches reach past the logo's sides", file=sys.stderr)
            return 1

    brand = ROOT / "assets/brand"
    brand.mkdir(exist_ok=True)
    word = wordmark()
    with tempfile.TemporaryDirectory() as temporary:
        work = Path(temporary)
        for theme, (name, _, cream, ink) in THEMES.items():
            document = documents[theme]
            defs, groups = mark_layers(document)

            for mode, colour in (("dark", cream), ("light", ink)):
                svg = svg_root(WIDTH, HEIGHT, f"0 0 {WIDTH:g} {HEIGHT:g}", logo=True)
                ET.SubElement(svg, "defs").extend(defs)
                logo = ET.SubElement(svg, "g", {"id": "akari-logo"})
                mark = ET.SubElement(logo, "g", {"id": "akari-print", "transform": f"translate({origin_x:.4f} {origin_y:.4f}) scale({scale:.6f})"})
                mark.extend(groups)
                letters = ET.fromstring(ET.tostring(word))
                for path in letters.iter(f"{{{SVG}}}path"):
                    path.set("fill", colour)
                logo.append(letters)
                text = write_svg(svg, ROOT / f"assets/logo/akari-logo-{theme}-{mode}.svg")
                download = brand / f"akari-logo-{name}-on-{mode}"
                download.with_suffix(".svg").write_text(text)
                print(f"Wrote {download.with_suffix('.svg').relative_to(ROOT)}")
                if not arguments.svg_only:
                    render_svg(text, LOGO_PNG_WIDTH, round(LOGO_PNG_WIDTH * HEIGHT / WIDTH), download.with_suffix(".png"), work)

            left, right, top = reaches[theme]
            left, right, top = min(left, arcs_left), max(right, arcs_right), min(top, arcs_top)
            svg = svg_root(right - left, arcs_bottom - top, f"{left:g} {top:g} {right - left:g} {arcs_bottom - top:g}", logo=False)
            ET.SubElement(svg, "defs").extend(defs)
            ET.SubElement(svg, "g", {"id": "akari-mark"}).extend(groups)
            text = write_svg(svg, brand / f"akari-mark-{name}.svg")
            if not arguments.svg_only:
                render_svg(text, MARK_PNG_WIDTH, round(MARK_PNG_WIDTH * (arcs_bottom - top) / (right - left)), brand / f"akari-mark-{name}.png", work)
                for mode, rendition in (("light", "Default"), ("dark", "Dark")):
                    render_icon(document, rendition, brand / f"akari-app-icon-{name}-{mode}.png")

    archive = ROOT / "brand/akari-brand.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as kit:
        for file in sorted(brand.iterdir()):
            if file.suffix in (".svg", ".png"):
                kit.write(file, f"akari-brand/{file.name}")
    print(f"Wrote {archive.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
