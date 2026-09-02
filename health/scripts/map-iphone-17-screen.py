#!/usr/bin/env python3
"""Replace the iPhone 17 Pro model's native OLED texture with an app screenshot."""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path


JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def align4(data: bytearray, pad: bytes = b"\x00") -> None:
    data.extend(pad * ((-len(data)) % 4))


def read_glb(path: Path) -> tuple[dict, bytearray]:
    data = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise ValueError(f"Unsupported GLB: {path}")

    document = None
    binary = None
    offset = 12
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8 : offset + 8 + chunk_length]
        if chunk_type == JSON_CHUNK:
            document = json.loads(chunk.rstrip(b" \t\r\n\x00"))
        elif chunk_type == BIN_CHUNK:
            binary = bytearray(chunk)
        offset += 8 + chunk_length

    if document is None or binary is None:
        raise ValueError(f"Missing JSON or BIN chunk: {path}")
    return document, binary


def write_glb(path: Path, document: dict, binary: bytearray) -> None:
    align4(binary)
    document["buffers"][0]["byteLength"] = len(binary)
    json_bytes = bytearray(json.dumps(document, separators=(",", ":")).encode())
    align4(json_bytes, b" ")

    total_length = 12 + 8 + len(json_bytes) + 8 + len(binary)
    output = bytearray(struct.pack("<4sII", b"glTF", 2, total_length))
    output.extend(struct.pack("<II", len(json_bytes), JSON_CHUNK))
    output.extend(json_bytes)
    output.extend(struct.pack("<II", len(binary), BIN_CHUNK))
    output.extend(binary)
    path.write_bytes(output)


def map_screen(source: Path, screenshot: Path, destination: Path) -> None:
    document, binary = read_glb(source)
    oled = next(
        (material for material in document.get("materials", []) if material.get("name") == "OLED"),
        None,
    )
    if oled is None:
        raise ValueError("The model has no material named OLED")

    glass = next(
        (material for material in document.get("materials", []) if material.get("name") == "Glass"),
        None,
    )
    if glass is not None:
        glass_surface = glass.setdefault("pbrMetallicRoughness", {})
        glass_surface["baseColorFactor"] = [0.0, 0.0, 0.0, 0.04]
        glass_surface["metallicFactor"] = 0.0
        glass_surface["roughnessFactor"] = 0.06

    for material in document.get("materials", []):
        if material.get("name") in {"Anodized aluminum", "Frosted glass"}:
            material.pop("normalTexture", None)

    # Subdue the source model's bright, slightly colored showroom finish.
    # This affects only the hardware; the OLED and its clear cover stay exact.
    for material in document.get("materials", []):
        if material.get("name") in {"OLED", "Glass"}:
            continue
        surface = material.setdefault("pbrMetallicRoughness", {})
        red, green, blue, alpha = surface.get(
            "baseColorFactor", [1.0, 1.0, 1.0, 1.0]
        )
        luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        saturation = 0.02
        brightness = 0.13
        surface["baseColorFactor"] = [
            brightness * (luminance + (red - luminance) * saturation),
            brightness * (luminance + (green - luminance) * saturation),
            brightness * (luminance + (blue - luminance) * saturation),
            alpha,
        ]
        if surface.get("metallicFactor", 0.0) > 0.4:
            surface["roughnessFactor"] = max(surface.get("roughnessFactor", 1.0), 0.5)

    pbr = oled.get("pbrMetallicRoughness", {})
    texture_indices = [
        pbr.get("baseColorTexture", {}).get("index"),
        oled.get("emissiveTexture", {}).get("index"),
    ]
    image_indices = {
        document["textures"][texture_index]["source"]
        for texture_index in texture_indices
        if texture_index is not None
    }
    if len(image_indices) != 1:
        raise ValueError(f"Expected one shared OLED image, got {sorted(image_indices)}")

    image_bytes = screenshot.read_bytes()
    align4(binary)
    image_offset = len(binary)
    binary.extend(image_bytes)
    image_view_index = len(document["bufferViews"])
    document["bufferViews"].append(
        {
            "buffer": 0,
            "byteOffset": image_offset,
            "byteLength": len(image_bytes),
        }
    )

    image_index = image_indices.pop()
    document["images"][image_index] = {
        "name": f"Akari screen: {screenshot.stem}",
        "bufferView": image_view_index,
        "mimeType": "image/png",
    }

    # This model's display UVs face outward from the reverse side of the
    # screen plane, so a regular phone capture reads mirrored from the front.
    # Flip the native OLED texture horizontally while keeping its exact crop.
    for texture_info in (pbr.get("baseColorTexture"), oled.get("emissiveTexture")):
        if texture_info is None:
            continue
        texture_info.setdefault("extensions", {})["KHR_texture_transform"] = {
            "offset": [1.0, 0.0],
            "scale": [-1.0, 1.0],
        }

    # Render the screenshot once, without lighting or the source model's
    # high-intensity emissive pass altering its authored colors.
    oled.pop("emissiveTexture", None)
    oled.pop("emissiveFactor", None)
    oled_extensions = oled.setdefault("extensions", {})
    oled_extensions.pop("KHR_materials_emissive_strength", None)
    oled_extensions["KHR_materials_unlit"] = {}
    pbr["metallicFactor"] = 0.0
    pbr["roughnessFactor"] = 1.0

    extensions_used = document.setdefault("extensionsUsed", [])
    if "KHR_materials_unlit" not in extensions_used:
        extensions_used.append("KHR_materials_unlit")
    if not any(
        "KHR_materials_emissive_strength" in material.get("extensions", {})
        for material in document.get("materials", [])
    ):
        document["extensionsUsed"] = [
            extension
            for extension in extensions_used
            if extension != "KHR_materials_emissive_strength"
        ]

    write_glb(destination, document, binary)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: map-iphone-17-screen.py SOURCE.glb SCREENSHOT.png DESTINATION.glb"
        )
    map_screen(*(Path(argument) for argument in sys.argv[1:]))
