"""Bed the registered roots into the terrain. The mask is idempotent and only
replaces WebP alpha, keeping the original compressed painting and atlas layout.
Run from the project root with Pillow and NumPy.
"""
import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image


def webp_chunks(data):
    offset = 12
    while offset < len(data):
        size = struct.unpack_from('<I', data, offset + 4)[0]
        end = offset + 8 + size + size % 2
        yield data[offset:offset + 4], data[offset:end]
        offset = end


def feather(path, frames, spread=1):
    original = path.read_bytes()
    with Image.open(io.BytesIO(original)) as image:
        alpha = np.array(image.getchannel('A'))
    for frame in frames:
        sx, sy, width, height = frame['crop']
        ax, ay = frame['anchor']
        # Only the strip containing the soil line needs work. Frame anchors
        # are local even for the small replacement notch in a variant atlas.
        top = max(0, int(ay - 160 * spread))
        if top >= height:
            continue
        y, x = np.ogrid[top:height, :width]
        x, y = (x - ax) / spread, (y - ay) / spread
        # Lateral roots recede into the ground sooner. Two scales of broken
        # edge let small traces of the actual soil show between bark ridges.
        side = np.minimum((np.abs(x) / 93) ** 1.45, 1.4)
        edge = -4 - 72 * side + 5 * np.sin(x * .084) + 3 * np.sin(x * .24 + y * .16)
        edge += 1.8 * np.sin(x * .81 - y * .35)
        coverage = np.clip((edge + 19 - y) / (46 + 9 * side), 0, 1)
        limit = np.rint(255 * coverage**2 * (3 - 2 * coverage)).astype(np.uint8)
        region = alpha[sy + top:sy + height, sx:sx + width]
        np.minimum(region, limit, out=region)

    # Ask libwebp to encode the alpha plane. Preserve VP8 colour bytes verbatim.
    carrier = Image.new('RGB', (alpha.shape[1], alpha.shape[0]))
    carrier.putalpha(Image.fromarray(alpha))
    encoded = io.BytesIO()
    carrier.save(encoded, format='WEBP', quality=75, alpha_quality=100)
    replacement = dict(webp_chunks(encoded.getvalue()))[b'ALPH']
    chunks = list(webp_chunks(original))
    assert any(tag == b'ALPH' for tag, _ in chunks), path
    payload = b'WEBP' + b''.join(replacement if tag == b'ALPH' else chunk for tag, chunk in chunks)
    path.write_bytes(b'RIFF' + struct.pack('<I', len(payload)) + payload)


if __name__ == '__main__':
    for tree in json.loads(Path('src/tree-art.json').read_text()):
        feather(Path('public' + tree['image']), tree['frames'])
    feather(Path('public/survival/woodland-forage-v2/apple-tree.webp'), [
        {'crop': [0, 0, 1254, 1254], 'anchor': [627, .94 * 1254]},
    ], spread=2.5)
