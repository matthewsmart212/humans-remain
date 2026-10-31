# Woodland placement and player visibility

The camp's inner stone ring is cleared of foliage, including the earlier fire-area trials. The perimeter is traced from the registered terrain preview and checked against both plant roots and crowns. The hearth, terrain artwork, stone paths, buildings and other props are preserved.

Outside the ring, smooth spatial variation creates dense woodland pockets, lower groundcover and occasional exposed soil. Neighbouring plants share complementary palettes; sizes vary without stretching the artwork. Existing automatic planting is refined once, using `terrainFoliageVersion: 2`. Owner-edited and manually added plants outside the clearing remain unchanged. Deleted plants are never recreated.

The previous fixture contained 1,811 plants. This pass removes 104 from the inner clearing and leaves 1,335 plants overall, in 1,360 total objects. These are QA fixture counts; the owner's current draft is migrated in place, never replaced with a captured fixture.

A thin warm outline appears only when foreground foliage covers a substantial part of the player. It follows the actual current idle, locomotion and combat rendering, is masked to covering canopies, and fades with geometric coverage. Foliage remains opaque and keeps its wind/contact animation. A local spatial query avoids scanning all plants; the outline uses one extra pose rendering in a small Skia layer, with no pixel readback or screen-sized effect. Foreground solid props suppress the effect, and normal depth sorting still applies.

Verification: `scripts/check-foliage-polish.mjs` checks the clearing, unchanged non-foliage placements and navigation, preservation of owner edits, migration/deletion behavior, varied sizes, and outline activation/depth. `scripts/render-foliage-polish.mjs` renders the real software Skia scene, checks that dense foliage invokes one outline pass, and compares enabled/disabled pixels to ensure the visual change is limited to the silhouette. TypeScript, the production build and the built Worker/SQLite save checks are also run before publication.

Visual files include the whole map, clear bonfire area, dense paths, idle/walking/night outline views and a walk/sprint clip. Four unavailable uploaded props are omitted only from these disposable visual fixtures, as in the prior QA pass; their live placements and artwork references are preserved. This is software renderer QA, not a new browser or iPhone performance measurement.
