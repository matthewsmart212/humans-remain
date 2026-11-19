"""Bake registered daytime canopy shadows for the shared world renderer."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CELL_WIDTH = 224
CELL_HEIGHT = 112
COLUMNS = 4


def canopy_shadow(alpha, anchor):
    """Project the standing crown onto the ground below and to the right of the trunk."""
    width, height = alpha.size
    py, px = np.indices((height, width))
    elevation = (anchor[1] - py) / width
    lateral = (px - anchor[0]) / width
    floor_x = lateral * .85 + elevation * .13
    floor_y = .095 + elevation * .07 - (elevation - height / width * .55) * .20 + lateral * .105
    x = np.rint((floor_x + .60) * CELL_WIDTH / 1.42).astype(int)
    y = np.rint((floor_y + .25) * CELL_HEIGHT / .71).astype(int)
    visible = (x >= 0) & (x < CELL_WIDTH) & (y >= 0) & (y < CELL_HEIGHT) & (elevation > .06)
    projected = np.zeros((CELL_HEIGHT, CELL_WIDTH), dtype=np.uint8)
    np.maximum.at(projected, (y[visible], x[visible]), np.asarray(alpha)[visible])
    mask = Image.fromarray(projected)
    # A narrow penumbra preserves the little clearings between leaves. The wider one
    # softens the outer crown, where daylight enters from more than one direction.
    narrow = np.asarray(mask.filter(ImageFilter.GaussianBlur(2.1))) / 255
    broad = np.asarray(mask.filter(ImageFilter.GaussianBlur(6.2))) / 255
    y, x = np.indices(projected.shape)
    root = np.exp(-(((x - CELL_WIDTH * .60 / 1.42) / (CELL_WIDTH * .115)) ** 2
                    + ((y - CELL_HEIGHT * .25 / .71) / (CELL_HEIGHT * .115)) ** 2))
    opacity = np.clip(67 * narrow + 38 * broad + 25 * root, 0, 120).astype('uint8')
    tile = Image.new('RGBA', (CELL_WIDTH, CELL_HEIGHT), (38, 31, 22))
    tile.putalpha(Image.fromarray(opacity))
    return tile


trees = json.loads((ROOT / 'src/tree-art.json').read_text())
sources = [(t['image'], t['frames'][0]['crop'], t['frames'][0]['anchor'])
           for t in trees if 'deadwood' not in t['id']]
sources.append(('/survival/woodland-forage-v2/apple-tree.webp', (0, 0, 1254, 1254), (627, 1254 * .94)))
rows = (len(sources) + COLUMNS - 1) // COLUMNS
atlas = Image.new('RGBA', (COLUMNS * CELL_WIDTH, rows * CELL_HEIGHT))
frames = {}
for index, (url, (left, top, width, height), anchor) in enumerate(sources):
    with Image.open(ROOT / ('public' + url)) as source:
        crown = source.getchannel('A').crop((left, top, left + width, top + height))
        tile = canopy_shadow(crown, anchor)
    atlas.paste(tile, ((index % COLUMNS) * CELL_WIDTH, (index // COLUMNS) * CELL_HEIGHT))
    frames[url] = index

atlas.save(ROOT / 'public/survival/woodland-canopy-v1/shade.webp', lossless=True, method=6)
(ROOT / 'src/tree-shade-frames.json').write_text(json.dumps(frames, indent=2) + '\n')
