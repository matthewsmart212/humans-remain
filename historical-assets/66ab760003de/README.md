# Southern works and scrap outskirts

Two adjoining sections extend south from the existing works. The broader western dirt approach opens into worn compacted work ground. The smaller eastern trail continues south, leaving a wide central stretch of grass and brown earth freely walkable away from roads. The few existing orange leaves remain only at the old top-left contact; no new leaf carpet or standing scenery was added.

Created with the built-in image-generation tool. `generation-prompts.json` records the initial outpaint and the targeted edit that removed a straight material transition beneath the northern contact. `generated-layout-original.png` preserves the first layout. `generated-master-original.png` is the selected native 1667 × 943 output; `registered-master.png` is the 2944 × 1666 master aligned to existing camp scale. Packaged sizes do not imply native generation resolution.

Runtime assets:

| File | Original camp source origin | Packaged size |
| --- | --- | --- |
| `public/survival/maps/south-works-v1/16-south-works-clearing.webp` | 7036, 4668 | 1538 × 1538 |
| `public/survival/maps/south-works-v1/17-scrap-outskirts-trail.webp` | 8442, 4668 | 1538 × 1538 |

`scripts/prepare-south-works.mjs` assembles the northern edge from the existing service track and dirt lane, including their horizontal 36-pixel blend. `scripts/package-south-works.mjs` preserves the first 132 master rows and blends the next 128 before cutting at row 128. The first four output rows exactly match that northern composite. The two cuts share 132 identical columns. Both decoded checks have zero channel error; see `terrain-manifest.json`.

The runtime uses a 36-pixel top feather inside a 132-pixel northern overlap, becoming opaque before the original 96-pixel bottom fade starts. `northBlendKey` removes the new top feather when its older neighbour is unavailable. The eastern image uses the established left feather. Original image files and their outer fades remain unchanged.

Movement checks cover both approaches, open-ground crossings, the new shared edge and the inward southwest corner. Production save/read handlers against in-memory SQLite preserve all 1,366 camp placements and accept new southern objects and an open-ground spawn. Missing textures block only missing ground; streaming prepares nearby sections and releases distant ones. Production CanvasKit captures cover the two northern contacts, four-image corner, new shared ground, outer boundary, portrait, night and missing-northern-image fallback. TypeScript passed. Final visual evidence is in `docs/qa/south-works-v1`. Browser and physical phone performance were not tested here.

Unused historical single-image exports were moved intact to `artwork-archive/retired-runtime/painted-terrain/` so the growing map still fits the deployment archive. Active terrain, native references and saved placements are unaffected.
