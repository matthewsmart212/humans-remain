# Upper waterfall animation pilot

This update animates only the broad upper waterfall. It does not extend the river or repaint any terrain, rocks or banks. The Camera tools now include a Waterfall shortcut for reviewing the pilot before applying it elsewhere.

Twelve generated transparent whitewater frames are crossfaded over a 1.5-second loop. A two-phase downward flow moves the existing waterfall detail without a visible reset; a slower spreading flow handles the landing pool. Only the bright highlights from the generated frames are layered in, avoiding a flat blue overlay. The stencil is traced inside the water edges and feathered, with the cliff faces and pool boulder excluded.

The original river artwork and collision masks are unchanged. The effect adds one culled draw only when this waterfall is visible. Its three small optional images total 309,428 bytes and add no editor-entry image requirement. Missing animation assets leave the approved original river visible.

## Assets and reproduction

- `public/survival/waterfall-pilot-v1/whitewater-frames.webp`: 640 × 480 atlas; twelve 160 × 160 frames.
- `public/survival/waterfall-pilot-v1/artwork.webp`: unchanged 280 × 260 crop of the approved river, encoded for runtime use.
- `public/survival/waterfall-pilot-v1/water-mask.png`: water-only technical stencil.
- `artwork-archive/waterfall-pilot-v1/frames-original.png`: original generated transparent artwork.
- `artwork-archive/waterfall-pilot-v1/prompt.json`: complete prompt, reference and built-in image-generation provenance.
- `scripts/package-waterfall.mjs`: reproduces runtime assets without editing the preserved originals.
- `scripts/check-waterfall.mjs`: actual CanvasKit render checks and preview generation.

## Verification

TypeScript and whitespace checks pass. CanvasKit compiled the shader and rendered twelve sample times. The first frame is reproduced exactly after one complete loop. Bright whitewater visibly changes; all pixels outside the water stencil remain identical, as do the sampled dry rocks. Other river sections remain pixel-identical. The missing-atlas fallback and non-blocking editor-entry contract pass. Exact pixel counts are in `checks.json`.

`waterfall-preview.gif` is a captured render of the pilot, and `before.png` / `frame-*.png` provide still comparisons. Browser and physical iPhone verification were unavailable; these checks use the real CanvasKit software renderer, not device performance measurements.
