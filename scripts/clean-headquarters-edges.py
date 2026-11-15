#!/usr/bin/env python3
"""Clean pale alpha-matte fringes on all four matched headquarters sprites.

The original canvas, furniture positions, colours of opaque parts and anchor
stay fixed. The manifest avoids repeated lossy re-encoding on future builds.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1] / "public/survival/headquarters-v4"
NAMES = (
    "repaired-interior.webp",
    "repaired-exterior.webp",
    "broken-interior.webp",
    "broken-exterior.webp",
)
MANIFEST = ROOT / ".alpha-cleanup.json"
REVISION = 2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean(path: Path) -> None:
    with Image.open(path) as src:
        if src.size != (1536, 1024):
            raise ValueError(f"{path.name}: unexpected HQ canvas {src.size}")
        if "A" not in src.getbands():
            raise ValueError(f"{path.name}: no transparent background")
        rgba = src.convert("RGBA")
    red, green, blue, alpha = rgba.split()
    rgb = Image.merge("RGB", (red, green, blue))
    # Borrow nearby solid building colours, not white RGB contamination from
    # the image background, for each partially transparent silhouette edge.
    solid = alpha.point(lambda value: 255 if value >= 230 else 0)
    known = solid
    bleed = Image.composite(rgb, Image.new("RGB", rgba.size), solid)
    for _ in range(14):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            neighbour = ImageChops.offset(known, dx, dy)
            missing = ImageChops.subtract(neighbour, known)
            bleed = Image.composite(ImageChops.offset(bleed, dx, dy), bleed, missing)
            known = ImageChops.lighter(known, neighbour)
    # Only retint translucent, light-coloured fringe pixels; preserve solid
    # stone, timber, doorway, table, and the original ground-contact shadows.
    # Retint pale translucent pixels left by an AI-generated white matte.
    # Extend the colour bleed so ground-contact and roof halos are covered.
    pale = rgb.convert("L").point(lambda value: max(0, min(255, (value - 115) * 4)))
    edge = alpha.point(lambda value: max(0, min(255, (255 - value) * 5)) if value > 0 else 0)
    replacement = ImageChops.multiply(pale, edge)
    clean_rgb = Image.composite(bleed, rgb, replacement)
    # Only remove faint fringe alpha; keep solid wooden and stone silhouettes.
    clean_alpha = alpha.point(lambda value: 0 if value <= 20 else round((value - 20) * 255 / 235) if value < 255 else 255)
    result = Image.merge("RGBA", (*clean_rgb.split(), clean_alpha))
    result.save(path, "WEBP", quality=95, method=6, exact=True)
    print(f"Cleaned HQ alpha edges: {path.name} ({path.stat().st_size:,} bytes)")


def main() -> None:
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    checked = previous.get("files", {}) if previous.get("version") == REVISION else {}
    for name in NAMES:
        path = ROOT / name
        if not path.exists():
            raise FileNotFoundError(f"Missing HQ sprite: {path}")
        if checked.get(name) != digest(path):
            clean(path)
    final = {"version": REVISION, "files": {name: digest(ROOT / name) for name in NAMES}}
    if previous != final:
        MANIFEST.write_text(json.dumps(final, indent=2) + "\n")
    print("HQ alpha-cleanup verified: all four registered textures")


if __name__ == "__main__":
    main()
