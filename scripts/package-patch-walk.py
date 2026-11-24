#!/usr/bin/env python3
"""Register generated walk frames with one common scale; preserve original RGBA.

Only atlas cutting, translation, common resizing and WebP encoding happen here.
All poses, articulated feet, paint and transparency are from the archived source.
No frame is independently stretched or resized, and no limbs are synthesized.
"""
from pathlib import Path
import hashlib
import json
import statistics

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artwork-archive/patch-v2/walk-source.png'
OUTPUT = ROOT / 'public/survival/patch-v2/walk.webp'
METADATA = ROOT / 'src/patch-walk-frames.json'
REPORT = ROOT / 'artwork-archive/patch-v2/packaging.json'
DIRECTIONS = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left']
CELL, ANCHOR, ROWS, COLUMNS = 256, (128, 228), 8, 8


def measure(frame):
    rgba = np.asarray(frame).astype(float)
    alpha = rgba[:, :, 3]
    occupied = alpha > 40
    yy, xx = np.where(occupied)
    if len(xx) < 1000:
        raise ValueError('Missing or incomplete walk frame')
    bounds = [int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1]
    left, top, right, bottom = bounds
    if min(left, top, frame.width - right, frame.height - bottom) < 3:
        raise ValueError('A generated frame touches its cell boundary')

    # The amber cage is the highest warm metal component. Measure its actual
    # luminous center for the shared post-night-shading beacon overlay.
    y_grid, x_grid = np.indices(alpha.shape)
    red, green, blue = (rgba[:, :, channel] for channel in range(3))
    beacon_band = (y_grid >= top) & (y_grid < top + (bottom - top) * .17)
    amber = (red > green * 1.15) & (green > blue * 1.35) & (green > 48) & (red > 100)
    weights = np.where(beacon_band & amber & occupied, (red - blue) * alpha / 255, 0)
    if weights.sum() < 100:
        raise ValueError('The generated caged lamp could not be registered')
    lamp = [float((x_grid * weights).sum() / weights.sum()), float((y_grid * weights).sum() / weights.sum())]

    # Find the central line of the feet over the complete cycle. Registering
    # each frame by its changing full silhouette would shift the torso every
    # time an arm swings out. One shared row ground axis avoids that drift.
    feet = occupied & (y_grid > top + (bottom - top) * .80)
    ground_x = float(x_grid[feet].mean())
    return {'bounds': bounds, 'lamp': lamp, 'groundX': ground_x}


def main():
    image = Image.open(SOURCE).convert('RGBA')
    frames, measurements = [], []
    for row in range(ROWS):
        row_frames, row_measurements = [], []
        for column in range(COLUMNS):
            box = (round(column * image.width / COLUMNS), round(row * image.height / ROWS),
                   round((column + 1) * image.width / COLUMNS), round((row + 1) * image.height / ROWS))
            frame = image.crop(box)
            row_frames.append(frame)
            row_measurements.append(measure(frame))
        frames.append(row_frames)
        measurements.append(row_measurements)

    # Match v1's approximately 200 painted pixels at a single shared scale.
    # Runtime increases its scale from .30 to .45 for a 50% larger companion.
    source_heights = [m['bounds'][3] - m['bounds'][1] for row in measurements for m in row]
    common_scale = 200 / statistics.median(source_heights)
    atlas = Image.new('RGBA', (CELL * COLUMNS, CELL * ROWS))
    lamps, registration = [], []
    for row in range(ROWS):
        lamp_x = statistics.mean(m['lamp'][0] for m in measurements[row])
        ground_x = statistics.mean(m['groundX'] for m in measurements[row])
        row_lamps, row_registration = [], []
        for column in range(COLUMNS):
            frame, measured = frames[row][column], measurements[row][column]
            scaled = frame.resize((round(frame.width * common_scale), round(frame.height * common_scale)), Image.Resampling.LANCZOS)
            # Counter atlas-placement jitter using the rigid lamp/chassis axis.
            # Vertical placement keeps the lowest planted foot on the ground.
            offset_x = round(ANCHOR[0] - (ground_x + measured['lamp'][0] - lamp_x) * common_scale)
            offset_y = round(ANCHOR[1] - measured['bounds'][3] * common_scale)
            cell = Image.new('RGBA', (CELL, CELL))
            cell.alpha_composite(scaled, (offset_x, offset_y))
            bounds = cell.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
            assert bounds and min(bounds[0], bounds[1], CELL - bounds[2], CELL - bounds[3]) >= 10, (row, column, bounds)
            atlas.alpha_composite(cell, (column * CELL, row * CELL))
            row_lamps.append([round(measured['lamp'][0] * common_scale + offset_x, 2),
                              round(measured['lamp'][1] * common_scale + offset_y, 2)])
            row_registration.append({'sourceBounds': measured['bounds'], 'sourceLamp': measured['lamp'],
                                     'translation': [offset_x, offset_y], 'paintedBounds': bounds})
        lamps.append(row_lamps)
        registration.append(row_registration)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT, 'WEBP', quality=93, method=6, exact=True)
    metadata = {'version': 1, 'cell': CELL, 'columns': COLUMNS, 'directions': DIRECTIONS,
                'anchor': list(ANCHOR), 'lamps': lamps}
    METADATA.write_text(json.dumps(metadata, separators=(',', ':')) + '\n')
    report = {'source': str(SOURCE.relative_to(ROOT)), 'sourceSize': list(image.size),
              'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
              'runtime': str(OUTPUT.relative_to(ROOT)), 'runtimeSize': list(atlas.size),
              'runtimeBytes': OUTPUT.stat().st_size, 'runtimeSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
              'commonScale': common_scale, 'paintedMedianHeight': 200, 'frames': 64,
              'sourceAlphaPreserved': True, 'individualFrameScaling': False,
              'registration': registration}
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['sourceSize', 'runtimeSize', 'runtimeBytes', 'commonScale', 'frames']}))


if __name__ == '__main__':
    main()
