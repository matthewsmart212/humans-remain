# River detail update

All six river paintings retain their original bank shapes, stream/lake shapes,
bridge positions, water collision and world coordinates. The current game uses
twice the texture width and height for nearby river detail. Twenty-one cropped
material edits were made with the built-in image generation tool; numeric image
registration and frequency-separated compositing restore fine painted detail
while retaining the original layout, palette and shoreline classification.

The active images are in `public/survival/river-detail-v5/`. The complete asset
mapping is `src/river-detail-manifest.json`. The final prompt set, native image
sizes and alignment measurements are in
`docs/qa/river-quality-v5/artwork.json`.

High detail streams in lossless 512px cores with 8px shared sampling gutters.
Medium detail and larger 512px previews cover lower zoom levels and loading.
The shared web/native river stream keeps its 20 MiB target budget and promotes
visible detail ahead of lookahead work. Immutable river image samplers are
reused, bounded and invalidated when their images leave the cache.

All six river reaches, side streams and the lake now use the directional surface
animation approved at the west camp bridge. The original painting is stationary,
including submerged rocks. One shared 384px transparent ripple texture moves
along the river and branch paths, using two overlapping phases to hide loop
resets. The headwaters have a flow path sampled from their existing water mask;
this changes motion only, with the original banks and water collision retained.

The shared surface costs 589,824 decoded bytes regardless of the number of
reaches. Rolling it out adds no textures or draw passes beyond the bridge trial.
The old foam atlas is no longer decoded or sampled by the active renderer, and
the painting refraction and trial boundary fade have been removed. The 20 MiB
streamed river-detail budget is unchanged. The ten existing waterfall areas keep
their localized animation and nearby detail sampling. The shared Skia adapter
runs the surface on web and iOS.

`docs/qa/river-surface-flow-v1/` retains the approved bridge trial. Current checks
in `docs/qa/river-surface-flow-world-v1/` cover all six reaches, four side features,
five batch joins, still banks/riverbed, loop closure, and a comparison against
the approved bridge image.

The six area checks render the actual placed world with the current player and
foliage, test water motion against stationary banks, verify unchanged collision
data and bridge routes, and exercise the production streaming/eviction code.
`docs/qa/river-quality-v5/checks.json` records the results. These are software
Skia checks, not a measurement of physical iPhone frame rate or GPU latency.

Superseded river textures are removed from the active source tree. Older image
URLs redirect to their aligned replacements. Historical paintings remain in
repository history; original user uploads and saved world data are untouched.

To reproduce asset preparation, restore the six pre-update paintings as
`.qa/river-quality/reference-NAME.png`, prepare the cropped job inputs, and use
the saved prompt set with the image generation tool. The package script expects
those job records and generated files. Run numeric alignment with
`python scripts/analyse-river-registration.py`, then
`node --expose-gc scripts/package-river-quality.mjs`.
