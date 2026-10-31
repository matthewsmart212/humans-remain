"""Pack generated bitmap artwork mechanically. No painting or per-pose scaling.

python3 scripts/prepare-scrap-bomber.py
Requires Pillow, NumPy, SciPy. Source PNGs live in art-source/scrap-bomber-v1.
"""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/scrap-bomber-v1'
OUT = ROOT / 'public/survival/scrap-bomber-v1'
OUT.mkdir(parents=True, exist_ok=True)
CELL, SCALE, ANCHOR = 384, .86, (192, 310)
VIEWS = ['down-left', 'down', 'right', 'up-right', 'up']

def cores(a, count):
    labels, _ = nd.label(a[:, :, 3] >= 100, np.ones((3, 3)))
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    ids = sorted(np.argsort(sizes)[-count:], key=lambda i: (
        int(nd.center_of_mass(labels == i)[0] // (a.shape[0] / (3 if count == 12 else 2))),
        nd.center_of_mass(labels == i)[1]))
    if count == 12:
        assert all(sizes[i] > 40000 for i in ids), 'Twelve complete robot cores required'
    main = np.zeros(labels.shape, dtype=np.int16)
    for index, ident in enumerate(ids, 1): main[labels == ident] = index
    return labels, main, ids

def robot_parts(a):
    labels, main, ids = cores(a, 12)
    dist, nearest = nd.distance_transform_edt(main == 0, return_indices=True)
    ownership = main[tuple(nearest)]
    ownership[(a[:, :, 3] == 0) | (dist > 4)] = 0
    parts = []
    for ident in range(1, 13):
        ys, xs = np.where(ownership == ident)
        l, t, r, b = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        rgba = a[t:b, l:r].copy()
        rgba[ownership[t:b, l:r] != ident] = 0
        parts.append((Image.fromarray(rgba), (int(l), int(t), int(r), int(b))))
    return parts

def landmark(a, col):
    # Orange upper shell only. Moving lower claws and rear hazard bands are excluded.
    cw = a.shape[1] // 4
    roi = a[70:175, col * cw + 70:col * cw + 300]
    r, g, b, alpha = roi.transpose(2, 0, 1).astype(float)
    mask = (alpha > 128) & (r > 115) & (g > 45) & (g < 180) & (r > g * 1.3) & (g > b * 1.3)
    yy, xx = np.where(mask)
    assert len(xx) > 300, 'Missing stable orange shell'
    return np.array([xx.mean() + 70, yy.mean() + 70])

def beacon(a):
    r, g, b, alpha = a.transpose(2, 0, 1).astype(float)
    mask = (alpha > 128) & (r > 115) & (r > g * 1.8) & (g < 90) & (b < 80)
    mask[190:] = False
    labels, n = nd.label(mask)
    if not n: return None
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    label = int(sizes.argmax())
    if sizes[label] < 6: return None
    yy, xx = np.where(labels == label)
    return [round(float(xx.mean()), 2), round(float(yy.mean()), 2)]

reports = []
for direction in VIEWS:
    a = np.array(Image.open(SOURCE / (direction + '.png')).convert('RGBA'))
    parts = robot_parts(a)
    cw, ch = a.shape[1] // 4, a.shape[0] // 3
    landmarks = np.array([landmark(a, col) for col in range(4)])
    shifts = landmarks.mean(axis=0) - landmarks
    origin = [np.mean([(bounds[0] + bounds[2]) / 2 - i * cw for i, (_, bounds) in enumerate(parts[:4])]),
              np.mean([bounds[3] for _, bounds in parts[:4]])]
    sheet = Image.new('RGBA', (CELL * 4, CELL * 3))
    frames, beacons = [], []
    for i, (part, bounds) in enumerate(parts):
        col, row = i % 4, i // 4
        local = np.array([bounds[0] - col * cw, bounds[1] - row * ch])
        left, top = np.rint(np.array(ANCHOR) + (local - origin + shifts[col]) * SCALE).astype(int)
        size = tuple(round(d * SCALE) for d in part.size)
        # Generated charge/collapse rows drift vertically. Plant their lowest
        # foot/shell contact at the average walking baseline; translation only
        # preserves the compressed brace or collapsed body's painted shape.
        ground_shift = 0
        if 4 <= i <= 7 or i >= 10:
            ground_shift = ANCHOR[1] - (int(top) + size[1])
            top += ground_shift
        assert min(left, top, CELL - left - size[0], CELL - top - size[1]) >= 9, (direction, i, left, top, size)
        tile = Image.new('RGBA', (CELL, CELL))
        tile.paste(part.resize(size, Image.Resampling.LANCZOS), (int(left), int(top)))
        sheet.paste(tile, (col * CELL, row * CELL))
        beacons.append(beacon(np.array(tile)))
        frames.append({'frame': i, 'sourceBounds': [*bounds[:2], bounds[2] - bounds[0], bounds[3] - bounds[1]],
            'contentBounds': [int(left), int(top), *size], 'registrationOffset': shifts[col].round(3).tolist(), 'groundRegistrationY': int(ground_shift)})
        if direction == 'down-left' and i == 0:
            tile.save(OUT / 'thumbnail.webp', 'WEBP', quality=92, method=6)
    fallback = beacons[5] or beacons[6] or [192, 115]
    beacons = [p or fallback for p in beacons]
    sheet.save(OUT / (direction + '.webp'), 'WEBP', quality=92, method=6)
    reports.append({'direction': direction, 'source': direction + '.png', 'scale': SCALE,
        'sourceOrigin': [round(float(v), 3) for v in origin], 'frames': frames, 'beacons': beacons,
        'bytes': (OUT / (direction + '.webp')).stat().st_size})

# Explosion pieces vary in placement and extent in the generated sheet. Assign
# disconnected sparks/debris to the nearest of its eight main opaque cores,
# keeping the source-size progression rather than fitting each effect to a box.
if '--robots-only' in sys.argv:
    previous = json.loads((OUT / 'atlas.json').read_text())['explosion']
    FX_CELL, FX_SCALE, FX_ANCHOR = previous['cell'], previous['scale'], previous['anchor']
    fx_frames = previous['packing']
else:
    a = np.array(Image.open(SOURCE / 'explosion.png').convert('RGBA'))
    labels, main, ids = cores(a, 8)
    centers = np.array([nd.center_of_mass(labels == ident)[::-1] for ident in ids])
    all_labels = np.unique(labels)
    ownership = np.zeros(labels.shape, dtype=np.int16)
    for ident in all_labels:
        if ident == 0: continue
        yy, xx = np.where(labels == ident)
        if len(xx) < 12: continue
        center = np.array([xx.mean(), yy.mean()])
        eligible = np.arange(4) if center[1] < a.shape[0] / 2 else np.arange(4, 8)
        owner = int(eligible[np.argmin(np.sum((centers[eligible] - center) ** 2, axis=1))])
        ownership[labels == ident] = owner + 1
    dist, nearest = nd.distance_transform_edt(ownership == 0, return_indices=True)
    ownership = ownership[tuple(nearest)]
    ownership[(dist > 5) | (a[:, :, 3] == 0)] = 0
    FX_CELL, FX_SCALE, FX_ANCHOR = 512, .85, [256, 430]
    fx_sheet = Image.new('RGBA', (FX_CELL * 4, FX_CELL * 2))
    fx_frames = []
    for i in range(8):
        yy, xx = np.where(ownership == i + 1)
        l, t, r, b = int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)
        rgba = a[t:b, l:r].copy(); rgba[ownership[t:b, l:r] != i + 1] = 0
        im = Image.fromarray(rgba)
        # Ground origin is aligned to each source effect's baseline; this changes
        # translation only. Source widths and heights all share FX_SCALE.
        origin_x = (l + r) / 2
        origin_y = b
        size = tuple(round(d * FX_SCALE) for d in im.size)
        left = round(FX_ANCHOR[0] + (l - origin_x) * FX_SCALE)
        top = round(FX_ANCHOR[1] + (t - origin_y) * FX_SCALE)
        assert min(left, top, FX_CELL - left - size[0], FX_CELL - top - size[1]) >= 8, (i, left, top, size)
        fx_sheet.paste(im.resize(size, Image.Resampling.LANCZOS), ((i % 4) * FX_CELL + left, (i // 4) * FX_CELL + top))
        fx_frames.append({'frame': i, 'sourceBounds': [l, t, r - l, b - t], 'contentBounds': [left, top, *size]})
    fx_sheet.save(OUT / 'explosion.webp', 'WEBP', quality=92, method=6)

image = lambda name: '/survival/scrap-bomber-v1/' + name + '.webp'
directions = {name: {'image': image(view), 'mirror': mirror} for name, view, mirror in [
    ('down', 'down', False), ('down-right', 'down-left', True), ('right', 'right', False),
    ('up-right', 'up-right', False), ('up', 'up', False), ('up-left', 'up-right', True),
    ('left', 'right', True), ('down-left', 'down-left', False)]}
meta = {'version': 1, 'cell': [CELL, CELL], 'anchor': ANCHOR, 'columns': 4, 'rows': 3,
    'walkFrames': [0, 1, 2, 3], 'armingFrames': [4, 5, 6, 7], 'hurtFrames': [8, 9],
    'disabledFrames': [10, 11], 'idleFrame': 0, 'directions': directions,
    'packing': {'scale': SCALE, 'perFrameScale': False, 'registration': 'Translation-only orange upper-shell registration. Charge and disabled rows receive an additional Y translation to plant feet/shell at the average walking baseline.'},
    'sources': reports,
    'explosion': {'key': 'bomber-explosion', 'image': image('explosion'), 'cell': FX_CELL, 'columns': 4,
        'anchor': FX_ANCHOR, 'frames': 8, 'duration': 1.05, 'scale': FX_SCALE, 'packing': fx_frames}}
(OUT / 'atlas.json').write_text(json.dumps(meta, indent=2) + '\n')
print(json.dumps({'cell': CELL, 'anchor': ANCHOR, 'bytes': sum(p.stat().st_size for p in OUT.glob('*.webp')), 'views': VIEWS, 'poses': 60, 'explosionFrames': 8}))
