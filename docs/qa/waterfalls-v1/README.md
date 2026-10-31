# Existing waterfall animation rollout

The approved upper-waterfall animation now also covers ten existing drops and
foamy rapids across the headwaters and logging river paintings. No river sections,
roads, terrain, collision, or placed objects were added or altered.

The twelve approved transparent frames are shared by all eleven locations. Each
new location has a hand-fitted water stencil, downstream flow direction, and
staggered phase. Rocks and banks stay fixed. Small masks load after editor entry;
river artwork uses the existing camera-driven detail stream and preview fallback.
The one reference crop at the batch overlap comes from the actual composited
river, avoiding a seam or reappearance of the underlying old painting.

Camera → Waterfalls focuses the approved pilot first. Next waterfall cycles
through all ten additional locations and then returns to the pilot.

## Reproduction

- `node scripts/package-waterfalls.mjs`: produces water-only masks and the one
  composite crop from existing artwork. Does not regenerate the approved atlas.
- `node scripts/check-waterfall.mjs`: original pilot regression.
- `node scripts/check-waterfalls.mjs`: renders every new location using the actual
  CanvasKit shaders, checks motion in bright foam, fixed pixels outside masks,
  loop continuity, optional-image fallback, preview rendering, and offscreen culling.
- `npm run typecheck`

`all-waterfalls.gif` contains actual rendered loops in this order (left to right,
top to bottom): headwater entry, boulder steps, middle boulder, bend rapids,
southern chute, plunge pool entry, pool outlet, upper logging, logging bend,
crossing drop. Individual before/after images and numeric results are alongside it.

The original pilot frame was also compared byte-for-byte with the deployed v144
reference. It is unchanged. QA used software CanvasKit rendering; no browser or
physical phone was available in this environment.
