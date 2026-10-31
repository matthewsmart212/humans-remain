# Woodland zoning refinement

Refines the two existing camp/outskirts planting passes into five coherent tree regions, using the current artwork. Based on cloud layout revision 70 (2,299 placements).

- Northern birch woodland: 29 trees.
- Western oak woodland: 45 trees.
- Eastern pine ridge: 14 trees.
- Southern rowan meadow: 21 trees.
- Lower riverside willows: 5 trees.

Each of the 33 tree groves uses one species. Companion foliage uses a limited regional palette; plants beside actual water retain a wetland palette. Existing irregular spacing and size variation remain. No additional objects or texture sources are introduced.

The one-time `woodlandZonesVersion` refinement runs after both planting passes. It changes only the asset and scale of placements that still exactly match their authored seed. Deleted items stay deleted, owner edits win, and later edits are not reset. Original camp placements, rocks, fallen logs, roads, terrain, spawn and root positions remain unchanged. The normal authenticated editor save persists the refinement when the owner reloads.

## Verification

`npm run typecheck`, the Sites production build, and `node scripts/check-woodland-zones.mjs` passed. The checks cover all 114 trees with actual timed axe contacts, log pickup and reachability from camp; 4,408 previously clear road samples; bridge approaches; layout validation; one-time migration and owner-edit preservation. The visible-object sample peak changed from 299 to 297.

`node scripts/render-woodland-zones.mjs` captures the actual production CanvasKit renderer with current saved placements and imported artwork. Compare `before-overview.webp` with `after-overview.webp`; other captures show camp and each regional palette. These are software renders, not browser or device performance measurements. Phone FPS and the pre-existing terrain streaming issue are outside this placement refinement.

`prepare-woodland-zones.mjs` deterministically rebuilds the reviewed data from the original planting seeds, constraining foliage to its old bounds and tree crowns away from roads and water.
