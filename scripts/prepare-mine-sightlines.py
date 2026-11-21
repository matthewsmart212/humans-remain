"""Bake the two rock ridgelines into three feathered camera masks at 1:8 scale."""
from bisect import bisect_right
from pathlib import Path
from PIL import Image

# (world Y, western divide X, eastern divide X, feather half-width). Fan out
# the soft edges into the shared junction; tighten them over solid rock below.
RIDGES = [
    (0, 1020, 2240, 350),
    (640, 1050, 2240, 320),
    (880, 1030, 2160, 220),
    (1060, 1030, 2170, 130),
    (1320, 1140, 2180, 100),
    (1460, 1145, 2170, 66),
    (1580, 1100, 2200, 52),
    (1720, 1100, 2190, 54),
    (1880, 1075, 2180, 46),
    (2040, 1020, 2195, 50),
    (2150, 990, 2200, 60),
    (2400, 890, 2240, 85),
    (2720, 800, 2280, 110),
]
WIDTH, HEIGHT = 450, 340
atlas = Image.new("RGBA", (WIDTH * 3, HEIGHT))
pixels = atlas.load()
levels = [r[0] for r in RIDGES]


def smooth(value):
    t = min(1, max(0, value))
    return t * t * (3 - 2 * t)


for row in range(HEIGHT):
    y = (row + .5) * 8
    index = bisect_right(levels, y) - 1
    a, b = RIDGES[index:index + 2]
    t = (y - a[0]) / (b[0] - a[0])
    west, east, feather = [v + (w - v) * t for v, w in zip(a[1:], b[1:])]
    for col in range(WIDTH):
        x = (col + .5) * 8
        past_west = smooth((x - west + feather) / (2 * feather))
        past_east = smooth((x - east + feather) / (2 * feather))
        for frame, opacity in enumerate((past_west, 1 - past_west + past_east, 1 - past_east)):
            pixels[frame * WIDTH + col, row] = (0, 0, 0, round(255 * opacity))

dest = Path(__file__).resolve().parents[1] / "public/survival/iron-mine-v1/chamber-masks.png"
atlas.save(dest, optimize=True)
