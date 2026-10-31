"""Measure complete painted sprites; writes metadata only, never edits pixels.

Requires Pillow, numpy and scipy in the asset-preparation environment.
The grids are deliberately not used as crop boundaries: boots cross their rows.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
directions = ['down', 'down-right', 'right', 'up-right', 'up']
frames = {}
sources = {}
for direction in directions:
    name = f'scrap-runner-{direction}-walk-sprint-v1.png'
    key = 'runnerCycle' + ''.join(s.title() for s in direction.split('-'))
    sources[key] = '/survival/scrap-runner/' + name
    rgba = np.array(Image.open(root / 'public' / sources[key][1:]).convert('RGBA'))
    labels, _ = ndimage.label(rgba[:, :, 3] > 24)
    boxes = []
    for i, s in enumerate(ndimage.find_objects(labels), 1):
        if s is None or np.count_nonzero(labels[s] == i) < 10000:
            continue
        y, x = s
        boxes.append((x.start, y.start, x.stop, y.stop))
    assert len(boxes) == 16, (direction, len(boxes))
    boxes.sort(key=lambda b: b[1])
    boxes = sum([sorted(boxes[i:i+4]) for i in range(0, 16, 4)], [])
    output = []
    for x0, y0, x1, y1 in boxes:
        # Hair silhouette registration removes the generated grid's offsets and
        # size drift without stretching legs or trimming any foreground pixels.
        head = rgba[y0:y0+int((y1-y0)*.49), x0:x1, 3] > 80
        hx = np.where(head)[1]
        width = int(hx.max() - hx.min() + 1)
        scale = 78 / width
        cx = x0 + (int(hx.min()) + int(hx.max())) / 2
        pad = 3
        crop = [max(0,x0-pad), max(0,y0-pad), min(rgba.shape[1],x1+pad), min(rgba.shape[0],y1+pad)]
        crop[2] -= crop[0]
        crop[3] -= crop[1]
        output.append(dict(sheet=key, crop=crop,
            anchor=[round(cx-crop[0],4), round(112/scale+y0-crop[1],4)],
            scale=round(scale,8)))
    frames[direction] = output

(root/'src/runner-cycle-frames.json').write_text(json.dumps(frames, separators=(',',':'))+'\n')
(root/'docs/runner-cycle-sources.json').write_text(json.dumps(sources, indent=2)+'\n')
print('Registered 80 complete sprites across five transparent directional sheets.')
