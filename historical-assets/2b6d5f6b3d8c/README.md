# Eastern works grounds

Two connected terrain pieces extend the east-facing works service track. A broad dirt lane crosses quieter brown ground, a narrower route heads north beside an open yard, and a smaller southern spur leaves room for the next district. Muted olive grass and deeper umber patches vary the ground. No new red/orange leaves, buildings or standing foliage are baked into the images.

Created with the built-in image-generation tool. `generation-prompts.json` retains the exact prompt and reference roles. `generated-master-original.png` is the selected native 990 × 1589 output. `registered-master.png` is the 1666 × 2676 master aligned to existing camp scale. Packaged dimensions do not imply native generation resolution.

Runtime assets:

| File | Original camp source origin | Packaged size |
| --- | --- | --- |
| `public/survival/maps/works-grounds-v1/11-works-yard.webp` | 8442, 2124 | 1538 × 1274 |
| `public/survival/maps/works-grounds-v1/12-works-dirt-lane.webp` | 8442, 3264 | 1538 × 1536 |

`scripts/prepare-works-grounds.mjs` reconstructs the existing western contact. `scripts/package-works-grounds.mjs` preserves the first 132 master columns, blends the next 128, and makes both lossless cuts from that single master. The first four output columns match the west contact exactly. The two cuts share 134 identical rows and paint once across source Y 3396. Decoded contact checks report zero channel error; details are in `terrain-manifest.json`.

The existing 36-pixel left feather and 132-pixel western overlap continue the established join. The lane remains complete when the yard image is unavailable. `src/works-grounds.ts` registers the new geometry, streaming keys and neighbours. Earlier textures, camp coordinates and saved placements are unchanged. The new north-facing corner is still an unfinished world edge; the next planned pass joins it to the northern works branch.

Validation: repeated physical walks from the saved camp through both new pieces, shared boundaries and return routes; missing-texture blocking, prefetch, eviction and reload; real save/read handlers against in-memory SQLite preserving the 1,366-placement camp fixture and new yard/lane placements; actual CanvasKit views of western contacts, the new shared boundary, outer corner, portrait, night and missing-yard fallback; TypeScript. Evidence is in `docs/qa/works-grounds-v1`. Software rendering does not constitute browser or physical phone performance testing.
