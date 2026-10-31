# Camp foliage transition

Extends the established camp planting beyond its former square image boundary while preserving all 4,153 placements from cloud layout revision 72. The 312 additional plants use the same foliage images as the existing camp, chosen from the nearest leaf community. Density, plant size and reach vary along the edge, with small isolated plants at the outside. No terrain, trees, solid footprints or camp props change.

The new fringe leaves 535 editor slots. The first 200 world units contain 115 additions, the next 250 contain 105, the next 300 contain 70, and the outer tail contains 22. Average plant width falls from 128 units near the established edge to about 96 in the outer fringe. The west adds fewer plants because existing woodland already blends that edge and occupies the available ground.

`prepare-camp-fringe.mjs` generates compact reviewed placement tuples offline. `addApprovedCampFringe()` applies them once after the full-world scenery migration. It respects owner additions, keeps all existing placements intact, and persists `campFringeVersion` through the normal authenticated editor save. Later deletions or moves are not regenerated.

Verification passed: TypeScript, production build, layout validation, existing-placement and solid-footprint preservation, repeat-load and owner-edit checks, and 1,248 transformed crown samples clear of roads and water. No additional texture URLs are loaded. Across 1,764 sampled 1800×1000 views, peak visible objects increase from 316 to 338; the existing local culling, contact animation and 220-plant idle-wind limit are unchanged. Browser GPU and physical phone FPS were not measured.

The before/after overview and north/south/east close-ups are actual production CanvasKit software renders. Run `node scripts/render-camp-fringe.mjs` to reproduce them. The screenshot is visual QA of the reviewed layout; it does not write the live cloud layout.
