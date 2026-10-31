# Roads beyond the camp exits

Six new individually designed road-and-earth sections extend the approved exit artwork along the existing world routes. This is the next connected rollout, not completion of every distant district road.

| Section | Treatment | Source rectangle (x, y, width, height) |
| --- | --- | --- |
| Northwest trail | Worn brown earth towards the logging route | -2050, -1100, 1536, 1024 |
| Village approach | Embedded paving and a cleaned-up branch junction | 4700, -1250, 1536, 1024 |
| Western trail | Warm dirt with irregular shoulders | -2250, 2300, 1536, 1024 |
| Southwest trail | Broken paving becoming an earth trail | -1700, 4800, 1536, 1024 |
| Southern trail | Narrow, gently winding earth path | 1400, 5400, 1024, 1536 |
| Eastern junction | Wider earth/gravel lane and north branch | 5400, 3650, 1536, 1024 |

The artwork was edited from native-scale captures of the actual game terrain, with the approved southeast road patch as the style reference. Each image contains its local road and earth together. No new foliage, green terrain, extra routes, buildings or river crossings were added.

Outer extensions render below the approved camp exits. Their overlapping ground feathers across 96 source pixels; the approved exits retain their opaque cores. Outer feather bands intentionally blend into the new sections. The original camp protection mask remains unchanged. Saved objects, route geometry and district connections are untouched.

## Artwork and prompts

- Mode: built-in ImageGen, precise-object-edit.
- Exact prompts and references: `artwork-archive/district-road-patches-v1/prompts.json` and `village-refinement.json`. The village junction was repositioned inside the opaque patch area after inspecting the first render.
- Generated source mapping: `artwork-archive/district-road-patches-v1/generated-files.json`.
- Native source PNGs: `artwork-archive/district-road-patches-v1/{section}.png`; the village runtime uses `village-approach-final.png`.
- Runtime artwork: `public/survival/district-road-patches-v1/{section}.webp`.
- Coordinates: `src/district-road-patches.json`.
- Dimensions and encoded sizes: `public/survival/district-road-patches-v1/manifest.json`.
- Repackage: `node scripts/package-district-road-patches.mjs` (quality 97, no resize).

Six optional images add approximately 4.4 MB compressed; exact sizes are in the manifest. They load at background priority after editor entry, and are culled outside the viewport when drawing. They still consume download and decoded-image memory; this update does not implement viewport-based image unloading or claim measured iPhone load-time improvements.

## Validation

`npm run typecheck`

`node scripts/check-world-roads.mjs --district-check`

The latter uses the production CanvasKit renderer to capture all six installed sections. It verifies the original camp interior and approved southeast opaque core pixel-for-pixel, checks that no new patch is in the editor entry set, and validates the existing 42 road sections, district connectivity, six bridge reservations and five quiet areas. Initial full-batch results: `docs/qa/district-road-patches-v1-initial-checks.json`. After the village-only refinement, the changed section and preservation assertions were rerun with `--patch=village-approach`; final results: `docs/qa/district-road-patches-v1-checks.json`.

Installed captures: `docs/qa/world-roads-v3/installed-{section}.webp`. Their corresponding `source-{section}.webp` files record the previous road treatment and exact layout guide.

No browser automation or physical iPhone test was available. More distant district routes, river/bridge artwork and district buildings remain to be completed.
