#!/usr/bin/env python3
"""Blend the actual HQ game's painted ground into the real terrain, without altering architecture.

The four authentic 1536x1024 repaired/broken interior/exterior sprites share
the same base. Their roof/exterior sprites also paint the lower soil, so
adjusting just the interiors would leave the old line whenever the roof is on.

All RGB values (wood, stone, furnishings, roof, and ground) stay byte-identical
after decoding. Only alpha in a narrow strip BELOW the building foundation
changes, exposing the actual game terrain instead of another coloured decal.
"""
import hashlib
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(os.environ.get("HQ_SPRITE_ROOT", str(Path(__file__).resolve().parents[1] / "public/survival/headquarters-v4")))
NAMES = ("repaired-interior.webp", "broken-interior.webp", "repaired-exterior.webp", "broken-exterior.webp")
MANIFEST = ROOT / ".terrain-blend.json"
ALPHA_MANIFEST = ROOT / ".alpha-cleanup.json"
SIZE = (1536, 1024)
REVISION = 3

# (horizontal position, first softened ground pixel, fully cleared ground)
# Coordinates are local to the real HQ's original asset, NOT the world map.
# A central step and its flanking stone pillars project farther forward than
# the side soil, so their protected silhouette extends lower than the dirt.
# Outside these four regions only soil alpha is reduced: no geometry moves.
FRONT_CONTACT = (
    (0.00, .67, .80), (0.05, .70, .82),
    (0.10, .77, .89), (0.16, .85, .95),
    (0.25, .84, .945), (0.29, .85, .95),
    (0.32, .935, .995), (0.35, .925, .995),
    (0.39, .885, .972), (0.50, .89, .975),
    (0.61, .885, .972), (0.65, .925, .995),
    (0.68, .935, .995), (0.71, .85, .95),
    (0.75, .84, .945), (0.84, .85, .95),
    (0.90, .77, .89), (0.95, .70, .82),
    (1.00, .67, .80),
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def contact_mask():
    width, height = SIZE
    u = (np.arange(width, dtype=np.float32) + .5) / width
    anchors = np.asarray(FRONT_CONTACT, dtype=np.float32)
    # Natural few-pixel ground irregularity. Never expands into the building.
    jitter = .0025*np.sin(u*21*np.pi) + .0015*np.sin(u*47*np.pi+.6)
    start = np.interp(u, anchors[:, 0], anchors[:, 1]) + jitter
    end = np.interp(u, anchors[:, 0], anchors[:, 2]) + jitter
    v = (np.arange(height, dtype=np.float32)[:, None] + .5) / height
    t = np.clip((v-start[None, :]) / (end-start)[None, :], 0, 1)
    # Smoothstep (no new hard polygon edge) and original alpha multiplied in.
    a = 1.0 - t*t*(3.0-2.0*t)
    return np.rint(a*255).astype(np.uint8), start


def soften(path: Path, contact: np.ndarray, start: np.ndarray):
    with Image.open(path) as src:
        if src.size != SIZE or "A" not in src.getbands():
            raise ValueError(f"{path.name}: expected the original 1536 x 1024 RGBA sprite")
        before = np.asarray(src.convert("RGBA")).copy()
    after = before.copy()
    after[:, :, 3] = ((before[:, :, 3].astype(np.uint16)*contact.astype(np.uint16)+127)//255).astype(np.uint8)
    changed = before[:, :, 3] != after[:, :, 3]
    if np.count_nonzero(changed) < 10000:
        raise AssertionError(f"{path.name}: contact apron was not significantly changed")
    y_coords = (np.arange(SIZE[1], dtype=np.float32)[:, None]+.5)/SIZE[1]
    if np.any(changed & (y_coords <= start[None, :])):
        raise AssertionError(f"{path.name}: protected building pixels were altered")
    if not np.array_equal(before[:, :, :3], after[:, :, :3]):
        raise AssertionError(f"{path.name}: an authored RGB/architecture pixel changed")
    # Make sure the previously opaque ground seam is genuinely softened.
    y = round(.96*SIZE[1]); x = SIZE[0]//2
    if before[y,x,3] > 100 and after[y,x,3] >= before[y,x,3]//2:
        raise AssertionError(f"{path.name}: centre ground at 96% still too opaque")
    Image.fromarray(after, "RGBA").save(path, "WEBP", lossless=True, method=6, exact=True)
    with Image.open(path) as saved:
        decoded = np.asarray(saved.convert("RGBA"))
    if not np.array_equal(decoded, after):
        raise AssertionError(f"{path.name}: resaving modified architecture or transparency unexpectedly")
    print(f"{path.name}: feathered {np.count_nonzero(changed):,} ground pixels, retained all RGB and protected geometry")
    for v in (.90,.93,.96):
        y=round(v*SIZE[1]);x=SIZE[0]//2
        print(f"  centre y={v:.0%}: alpha {before[y,x,3]} -> {after[y,x,3]}")


def main():
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    current = {name: digest(ROOT/name) for name in NAMES}
    if previous.get("version")==REVISION and previous.get("files")==current:
        print("Authentic HQ four-state soil blend already applied; skipping")
        return
    contact, start = contact_mask()
    for name in NAMES:
        soften(ROOT/name, contact, start)
    if ALPHA_MANIFEST.exists():
        alpha = json.loads(ALPHA_MANIFEST.read_text())
        for name in NAMES:
            alpha.setdefault("files", {})[name]=digest(ROOT/name)
        ALPHA_MANIFEST.write_text(json.dumps(alpha,indent=2)+"\n")
    MANIFEST.write_text(json.dumps({"version":REVISION,"files":{name:digest(ROOT/name) for name in NAMES}},indent=2)+"\n")
    print("All four authentic HQ states now share the same terrain-only alpha blend")


if __name__=="__main__":
    main()
