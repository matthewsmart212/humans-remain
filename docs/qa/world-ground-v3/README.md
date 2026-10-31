# Clear earth mixed through the world

Added a quiet compact-earth material based on the original campfire clearing. It blends through the approved rockier ground using irregular, continuous world-coordinate patches. Some areas open out into clear soil; other areas retain their larger painted earth fragments. The mask crosses square boundaries and is independent of texture rotation.

Removed the olive material from the active texture sources and removed the green colour treatment. The former green districts now use lighter warm/brown soil; woodland and industrial areas retain deeper browns. Vegetation remains separately placed foliage.

The original camp images and the approved warm/brown materials are unchanged. World coordinates, square sizes, overlaps, saved layout data and the entry-loading sequence are unchanged. The clear-earth texture replaces the olive texture in the three-image shared set.

## Checks

- TypeScript checking and whitespace/diff checks passed.
- 15 actual CanvasKit renderer captures cover districts, camp contact, a four-square contact, transitions, close-up, portrait and night views. Existing colour checks now require earth tones in the formerly green regions.
- `southern-meadow-earth.webp` and `meadow-detail.webp` show a clear-soil opening blending into rockier ground.
- `public/planning/built-ground-earth-v3.webp` is the complete rendered world; the planning page uses this updated image.
- No browser automation or physical iPhone test was available. These are production-renderer software-surface checks.

## Artwork and prompt

Created using the built-in `image_gen.imagegen` tool. Reference: `public/survival/camp-ground-v3/bonfire-clearing.webp`.

Final new asset: `public/survival/world-ground-v3/clear-earth.webp`, 1254×1254 lossless WebP. The exact prompt is in `artwork-archive/world-ground-v3/prompts.json`, with its generated original alongside it. `scripts/package-world-ground-v3.mjs` reproduces the encoding without painting or resizing.

The other active assets are `public/survival/world-ground-v2/warm.webp` and `public/survival/world-ground-v2/brown.webp`. The three images total 6,814,522 bytes; decoded dimensions and texture count remain the same.
