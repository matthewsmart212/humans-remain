# Consistent camp-derived terrain

Replaces all 26 post-camp ground images. Original camp textures, streaming keys,
rectangle geometry, movement boundaries and saved objects are unchanged.

The built-in ImageGen tool edited three exact 650×600 crops of approved camp
soil: warm, slightly olive, and slightly neutral brown. Full prompts are in
`prompts.json`; original generated results and normalized materials are retained.
The original crop positions and registry are recorded by the preparation script.

`scripts/build-consistent-terrain.mjs` quilts these painted materials at camp
scale into one registered surface. It preserves the existing road artwork using
traced corridors, retains camp contact pixels and exports lossless runtime cuts.
All overlapping extension pixels must match exactly. No new vegetation or
objects are painted onto the new soil. Some original roadside detail remains
inside preserved route corridors; original camp artwork is deliberately intact.

Superseded runtime textures are recoverable in `retired-runtime/`. Do not run
the one-time prepare/integrate scripts against the migrated registry. Rebuild
uses the original registry and archived old route artwork. Its scratch floor
cache may be removed to regenerate the deterministic quilt.

Validation: all-section production CanvasKit software renders, pairwise shared
pixel comparisons, typecheck, movement/streaming and in-memory saved-world tests.
No physical-device or browser test was available. The assembled image includes
unbuilt space for cutting only; the actual playable footprint did not expand.
