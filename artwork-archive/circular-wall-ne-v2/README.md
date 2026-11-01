# North-east camp road opening

This change moves the opening between sections 02 and 03 onto the painted stone road. The previous map trace put the opening at 37.059–47.149 degrees. Inspection of the rendered terrain places the stone crossing at approximately 49–54 degrees, so the new finished opening runs from **47 to 57 degrees**. Angles are clockwise from north on the existing 1650-unit circle.

Section 02 now spans 22.5–47 degrees; section 03 spans 57–67.5 degrees. Their joins to sections 01 and 04 retain the original endpoints. The fourteen other active wall pieces, all five other openings, the camp centre, the terrain, and the existing darker wall artwork are preserved.

## Source and geometry

- `previous-art.json` and `previous-layout.json` capture the published version-326 baseline.
- `geometry/build-guides.mjs` creates only the two replacement geometric guides. It does not make painted game artwork.
- `geometry/manifest.json` records the circle, exact endpoints, anchors, posts, guide bounds, and collision geometry.
- `generated/wall-02.png` and `generated/wall-03.png` hold the untouched selected ImageGen outputs. Their prompts and image provenance are recorded separately by the asset generation workflow.
- `process-art.mjs` registers the selected artwork, writes PNG and lossless WebP delivery files, and updates the runtime metadata and placement plan together.

The section-02 plank and post loops extend beyond its old nominal 45-degree sector edge. The exposed post at 47 degrees replaces the nearby 45-degree grid post to keep the end physically distinct. Section 03 has a finished post at 57 degrees; the shared 67.5-degree join post still belongs to section 04.

The projection and scale remain unchanged: screen X = X, screen Y = Y − height, with 1.4 pixels per world unit. Guide canvases retain the original 1536-square registration and source crop centres. Each replacement runtime anchor follows the midpoint of its new retained arc.

## Runtime compatibility

The replacement asset IDs are `camp_circular_wall_02_ne_v2` and `camp_circular_wall_03_ne_v2`. The canonical placement IDs are retained so the narrow version-5-to-6 migration can identify the two original placements. The original `camp_circular_wall_02` and `camp_circular_wall_03` definitions remain available, with their original dark image URLs and complete geometry, for owner-edited placements and deferred saved runs. There are sixteen active planned sections and eighteen resolvable asset definitions.

The migration itself is implemented in `src/camp-perimeter.ts`; it is separate from this artwork processor. The processor does not write the hosted world, native snapshots, player saves, or Git history.

## Packaging

Run from the repository root with the optional artwork dependencies `sharp` and `@napi-rs/canvas` available:

```sh
node artwork-archive/circular-wall-ne-v2/geometry/build-guides.mjs
node artwork-archive/circular-wall-ne-v2/process-art.mjs
```

Packaging selects the dominant connected alpha component's bounding rectangle, aligns it to the precise guide bounds, and trims it with transparent padding. It does not synthesize, repaint, or recolour the generated artwork. It verifies visible PNG/WebP pixel equality, every alpha byte after WebP encoding, source-file hashes, normalized collision bounds, and preservation of all existing sprites and metadata. Non-uniform registration adjustments exceeding eight percent are flagged for visual inspection.

`registration-report.json` records the actual source/output hashes and results. `previews/complete-ring.jpg` and `previews/ne-registered-sprites.jpg` compose the real registered sprites on the mathematical circle. These are artwork registration checks; final validation also uses the game's painted terrain, full collision world, save migration, native asset registration, and production build.
