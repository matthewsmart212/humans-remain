# World scenery pack

28 optional editor assets matched to the current warm-earth and brown woodland terrain, camp foliage, mossy walls and Scrap Runner. All raster art was made with built-in image generation using actual game artwork as references. Full prompts: `docs/world-scenery-prompts.json`.

## Find the assets

Open the world editor's asset library and search for **World foliage**, **World scenery**, or **Choppable trees**. None is automatically planted. Existing camp and world placements remain unchanged.

| Group | New designs | Suggested use |
| --- | --- | --- |
| Woodland foliage | Sword fern, juniper, hazel, bluebells, creeping ivy, moss cushions | Darker soil, shaded forest, fallen wood |
| Dryland foliage | Silver sage, copper bracken, russet bilberry, golden tussock, dusky heather | Dry tracks, exposed ground, rocky district edges |
| Wetland foliage | Willow scrub, alder, river sedge, reeds, butterbur | Riverbanks and stream edges, not in deep water |
| Meadow foliage | Fescue, cream yarrow, dock, amber blackberry | Open areas with scattered clumps and clear walking space |
| Fallen wood | Mossy fallen oak, hollow birch log, twisted root snag | Forest-edge landmarks and natural obstacles |
| Rock outcrops | Mossy boulders, low slate ridge, ochre crag | Low relief, route edges and small landmarks |
| Choppable trees | Amber rowan, river willow | Woodland variation and riverbank canopy |

Start each area with two or three dominant plant species and a few accent plants. Build uneven clumps with open gaps, vary scale modestly (roughly 80–115%), and mirror occasional pieces. Place logs and outcrops as landmarks, with smaller plants around their edges. Keep the route through each area readable and reserve reeds and butterbur for the shoreline.

Foliage bends under footsteps using the existing spatially indexed foliage system, is non-blocking, depth-sorted and respects reduced motion. The six logs/rocks are static scenery with traced ground footprints; they do not drop resources. Both trees reuse the existing intact → notched → stump behaviour; no new harvest inventory or regrowth is implied. Berry-bearing plants are decorative for now.

## Art files and rendering

Twenty-six transparent WebP cutouts are in `public/survival/world-scenery-v1/`. The two three-state tree atlases are in `public/survival/trees-world-v1/`. Their dimensions, ground anchors and world sizes are recorded in `src/world-scenery-art.json` and `src/tree-art.json`; rock/log blocker shapes are in `src/scenery-collisions.json`.

The renderer loads assets when they are placed, not simply because they exist in the catalogue. Repeated instances share the same decoded texture. Plants reuse existing visibility culling and local contact queries, without additional per-instance animation sheets. Tree stages share one image per species with no per-hit decoding.

The 28 new files total 3,265,080 bytes (about 3.1 MiB). Loading every new design at once uses about 30.3 MiB of decoded RGBA textures before GPU/renderer overhead. Transparent outer padding was cropped before delivery sizing; source alpha is preserved within the padded cutout. Plants are at most 384 pixels, and the larger logs/rocks range from 640 to 896 pixels on their longest edge.

To keep the publish bundle bounded, four existing PNG assets were losslessly encoded to WebP. Tests verify identical alpha and visible RGB pixels; originals remain available in source/native exports, and the old web paths redirect. No terrain or existing artwork was downscaled.

## Verification

- `node scripts/check-world-scenery.mjs`: catalogue, transparency, placement validation, image sharing, unused startup images, foliage bending, reduced motion, culling, ground collisions and saved-draft immutability.
- `node scripts/scenery-review-sheet.mjs`: every foliage design and each rock/log with its ground anchor and blocker outline, reviewed against the actual exported sprite.
- `node scripts/check-trees.mjs docs/qa/world-scenery-v1/trees`: all six species and eighteen states, contact/health/range/obstruction, rotated/mirrored/scaled roots, reset and shared texture checks.
- `node scripts/render-world-scenery.mjs`: production CanvasKit renders on the actual current outdoor terrain, with disposable planting arrangements; no live map writes.
- TypeScript and production build checks.

Software-renderer checks do not establish browser GPU or physical iPhone frame rates. The preview scenes are examples, not saved changes to the owner's world.
