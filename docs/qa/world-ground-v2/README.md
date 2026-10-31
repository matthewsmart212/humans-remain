# Camp-matched world terrain

The surrounding ground now uses a native-scale section of the original camp as its art reference. Larger painted earth fragments replace the old fine-grained, rippled material. The selected version keeps calmer bare soil between the fragments. The original camp artwork, coordinate scale, 256 world squares and 200-source-pixel overlaps are unchanged.

The warm, brown and olive materials share the same detail scale. The broad regional colour fields retain their positions and gradual transitions. Olive highlights were calibrated after rendering to keep them earthy rather than blue-green.

## Visual checks

- `camp-edge-before-after.webp`: identical camera and player; before on the left, after on the right.
- `before-*.webp` and `after-*.webp`: all four camp contacts at one displayed pixel per original camp source pixel.
- `regions/`: 15 production CanvasKit renders covering districts, transitions, a four-square contact, close-up views, portrait and night. The existing regional-colour checks passed.
- `public/planning/built-ground-regions-v2.webp`: complete world overview rendered using the same ground code and assets as the game.

Visual review finds the earth-fragment sizes substantially closer to the camp and the old small repeated ridges reduced. This is hand-painted material matching, not a claim of pixel-identical artwork. Foliage and roads are still separate assets outside the original camp.

TypeScript checking passed. Browser automation and a physical iPhone comparison were unavailable; these are production-renderer software-surface checks. No saved layout or player coordinates were changed.

## Asset and prompt record

Created with the built-in `image_gen.imagegen` tool. Final runtime files:

- `public/survival/world-ground-v2/warm.webp`
- `public/survival/world-ground-v2/brown.webp`
- `public/survival/world-ground-v2/olive.webp`

All three are 1254×1254 lossless WebP, drawn into the existing 1437.5-source-pixel footprints. The source reference was a 1438×1438 native crop at (1500,150) from `public/survival/camp-ground-v3/full-4800.webp`. No runtime sharpening, texture enlargement or world rescaling was added.

The exact generation/edit prompts are saved in `artwork-archive/world-ground-v2/prompts.json`. Original generated PNGs and the camp reference are alongside that file. `scripts/package-world-ground-v2.mjs` reproduces the lossless runtime encoding without painting or resizing.

The three shared downloads total 6,791,058 bytes, versus 7,249,072 bytes previously. Image count and decoded dimensions are unchanged. The fast-entry loading order remains intact.
