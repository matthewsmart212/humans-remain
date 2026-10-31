# Terrain-matched interactive foliage

Three broader, lower foliage designs echo the rounded overlapping leaves in the painted terrain: moss leaf clumps, golden paddle leaves and flowering groundcover. Twenty-four placements form loose groups west, southwest, east and north of the bonfire. They use the existing rooted mesh, sway, contact bending, recovery and depth sorting. They have no collision bodies.

The upgrade appends to the chosen local/cloud draft on editor startup. It preserves existing placements, terrain and spawn, respects new obstacles, and records `foliageTrialVersion: 3`. It never recreates deleted plants on subsequent loads. An authenticated owner saves through the existing revision-checked API. No live database layout was overwritten during development.

## Artwork

Generated with the built-in `image_gen.imagegen` tool, with a transparent background and terrain crops as references. The originals are preserved under `artwork-archive/foliage-v3/`; exact prompts and input-reference paths are in `prompts.json`. Reference crops are also archived there as `reference-*.png`.

| Design | Runtime file | World width | Download bytes |
| --- | --- | ---: | ---: |
| Broad moss leaf clump | `public/survival/foliage-v3/moss-rosette.webp` | 165 | 92,772 |
| Golden paddle leaf clump | `public/survival/foliage-v3/lime-rosette.webp` | 150 | 82,110 |
| Flowering woodland groundcover | `public/survival/foliage-v3/flower-leaf-clump.webp` | 205 | 94,232 |

The three runtime textures total 269,114 bytes. Packaging only cleans near-transparent fringe pixels, trims transparent margins, resizes and encodes lossless WebP. It does not repaint the generated artwork. Reproduce with `node scripts/package-terrain-foliage.mjs` using the archived originals. Crop, dimensions and anchors are recorded in `packaging.json`.

## Verification

- TypeScript and production build passed.
- Existing foliage and expansion checks passed.
- `scripts/check-terrain-foliage.mjs` preserves 85 prior placements, adds 24 plants for 84 total foliage objects, and verifies deletion persistence, no duplicates, new-blocker avoidance, unchanged passability, a clear southern cooking approach, transparent texture edges and rooted contact motion.
- `scripts/check-foliage-server.mjs` exercises the built Worker and SQLite: all ten foliage IDs and marker 3 save/load, deletion persists, and authorization/concurrency checks remain enforced.
- `scripts/render-terrain-foliage.mjs` runs the actual software Skia renderer. Day/night, front/behind overlap and walk/sprint outputs are in `docs/qa/foliage-v3/`.

The QA layout is version 99 reconstructed from the previously verified revision 58 snapshot using its deterministic expansion. The live bounded D1 reader confirmed revision 59 and marker 2, but truncated the complete draft. The new upgrade operates on the actual selected draft at runtime, rather than replacing it with this fixture.

The visual outputs are a standalone foliage/terrain study, not screenshots of the full live camp. Five remote-upload placements (including the uploaded bonfire background) were omitted from this disposable visual scene because the live HTTP fetches timed out. They remain untouched in production. Browser and iPhone GPU checks were unavailable; no device frame-rate claim is made.
