"""Slice the approved ImageGen atlas; preserve every sprite's original alpha and pixels."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
source = root / 'artwork-archive/vegetable-crops-v1/growth-atlas.png'
out = root / 'public/survival/vegetable-crops-v1'
out.mkdir(parents=True, exist_ok=True)
im = Image.open(source).convert('RGBA')
cw, ch = im.width // 4, im.height // 3
names = [f'{kind}-stage-{stage}' for kind in ('potato','carrot') for stage in range(4)]
names += ['potato-picked','carrot-picked','potato-item','carrot-item']
for i, name in enumerate(names):
    col, row = i % 4, i // 4
    tile = im.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))
    if name.endswith('-item'):
        tile = tile.crop(tile.getbbox())
        tile.thumbnail((216,216), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA',(256,256))
        canvas.alpha_composite(tile,((256-tile.width)//2,(256-tile.height)//2))
    else:
        # Equal cells retain the scale progression, root anchor and camera.
        canvas = tile.resize((256,256),Image.Resampling.LANCZOS)
    canvas.save(out / (name+'.webp'),lossless=True,method=6)
print(f'Exported {len(names)} transparent 256px sprites')
