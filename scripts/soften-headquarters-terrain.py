#!/usr/bin/env python3
"""Use the ORIGINAL in-game HQ bases; only feather the exterior soil pixels.

Both repair states keep every interior/building pixel exactly as authored.
Roof and exterior sprites are not loaded or changed.
"""
import hashlib
import json
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(os.environ.get(
    "HQ_SPRITE_ROOT",
    str(Path(__file__).resolve().parents[1] / "public/survival/headquarters-v4"),
))
NAMES = ("repaired-interior.webp", "broken-interior.webp")
MANIFEST = ROOT / ".terrain-blend.json"
ALPHA_MANIFEST = ROOT / ".alpha-cleanup.json"
VERSION = 1
SIZE = (1536, 1024)

# An intentionally conservative protected outline around the full authored
# building. Everything inside it -- roofless room, table, furnishings,
# lanterns, steps, side crates/log store and walls -- is never edited.
# Only the soft ground halo OUTSIDE this envelope becomes transparent,
# revealing the game's own matching dirt, stones and leaves beneath it.
BUILDING_SILHOUETTE = [
    (0, 0), (1, 0), (1, .44), (.95, .44),
    (.92, .61), (.92, .82), (.94, .87), (.85, .93),
    (.74, .94), (.67, .93), (.63, .975), (.37, .975),
    (.33, .93), (.26, .94), (.15, .93), (.06, .87),
    (.08, .82), (.08, .61), (.05, .44), (0, .44),
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def masks():
    protected = Image.new("L", SIZE, 0)
    ImageDraw.Draw(protected).polygon([
        (round(x * SIZE[0]), round(y * SIZE[1]))
        for x, y in BUILDING_SILHOUETTE
    ], fill=255)
    # Max with the original protected mask is important: Gaussian blur alone
    # would change building-edge pixels that the user wants kept exactly.
    feather = ImageChops.lighter(
        protected, protected.filter(ImageFilter.GaussianBlur(30))
    )
    return protected, feather


def soften(path: Path, protected: Image.Image, feather: Image.Image):
    with Image.open(path) as src:
        if src.size != SIZE or "A" not in src.getbands():
            raise ValueError(f"Expected real 1536x1024 RGBA HQ base: {path}")
        original = src.convert("RGBA")
    red, green, blue, alpha = original.split()
    new_alpha = ImageChops.multiply(alpha, feather)
    removed = ImageChops.subtract(alpha, new_alpha)
    if not removed.getbbox():
        raise ValueError(f"{path.name}: no outside terrain was found to feather")
    if ImageChops.multiply(removed, protected).getbbox():
        raise AssertionError(f"{path.name}: protected building was altered")
    # Keep ALL source RGB values. Only ground alpha outside the protected
    # architectural region is softened. Lossless encoding prevents re-drawing
    # or shifting even a single building/detail pixel.
    Image.merge("RGBA", (red, green, blue, new_alpha)).save(
        path, "WEBP", lossless=True, method=6, exact=True
    )
    with Image.open(path) as saved:
        result = saved.convert("RGBA")
    for original_channel, result_channel in zip(original.split(), result.split()):
        changed = ImageChops.difference(original_channel, result_channel)
        if ImageChops.multiply(changed, protected).getbbox():
            raise AssertionError(f"{path.name}: protected building pixels changed")
    affected = sum(bool(value) for value in removed.getdata())
    print(f"{path.name}: feathered {affected:,} exterior ground pixels; architecture identical")


def main():
    if not ROOT.is_dir():
        raise FileNotFoundError(ROOT)
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    current = {name: digest(ROOT / name) for name in NAMES}
    if previous.get("version") == VERSION and previous.get("files") == current:
        print("Original HQ bases already contain terrain-only blend; no rewrite")
        return
    protected, feather = masks()
    for name in NAMES:
        soften(ROOT / name, protected, feather)
    # Prevent the earlier matte-cleanup pipeline from re-encoding the newly
    # feathered bases on future web builds; leave the two roof hashes alone.
    if ALPHA_MANIFEST.exists():
        alpha_manifest = json.loads(ALPHA_MANIFEST.read_text())
        for name in NAMES:
            alpha_manifest.setdefault("files", {})[name] = digest(ROOT / name)
        ALPHA_MANIFEST.write_text(json.dumps(alpha_manifest, indent=2) + "\n")
    MANIFEST.write_text(json.dumps({
        "version": VERSION, "files": {name: digest(ROOT / name) for name in NAMES},
    }, indent=2) + "\n")
    print("Verified: two authentic HQ bases edited; both roof textures untouched")


if __name__ == "__main__":
    main()
