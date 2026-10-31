# World scenery expansion

Composed against cloud layout revision 71, preserving all 2,299 existing camp and woodland placements. Adds 1,854 placements across 15 regions: 327 choppable trees, 1,212 foliage pieces, 295 rocks/outcrops and 20 fallen logs. The combined layout has 4,153 objects and leaves 847 editor slots.

## Regional composition

Pine woods surround the northwest logging ground; birches follow the northern passage; oaks frame the future village and western woods. Pine/heather and pale stone carry through the eastern approach. The far eastern hollows and scrapyard margins use sparse weathered deadwood and basalt. Southern areas use open rowan meadows, golden scrub and sandstone. Willows, reeds and sedges follow both banks of the installed river and lake.

The 121 new groves use one tree family each, irregular spacing, varied scale and a small companion plant palette. Bigger slate ridges and ochre outcrops are occasional landmarks. Ground, rivers and roads are unchanged. Future district building cores, railway alignment, future water corridors and bridge approaches remain clear. Rock and fallen-log scenery does not add mining or log collection mechanics; standing trees retain their existing chopping states and manual log pickup.

No new art files are required. Five existing shared image sources become used by this layout, adding about 0.95 MB compressed / 10.74 MiB decoded scenery. Repeated objects share those images. The single-species zones established near camp are retained.

## Integration

`prepare-world-planting.mjs` composes the data offline from authored region palettes and installed geometry. Clearance uses the actual solid footprint radius for wide rocks, plus road, river and canopy checks. `src/world-planting.ts` applies the approved result once, after woodland zoning, and the owner editor persists it using its authenticated save. Owner additions win; deleted or moved items are not regenerated after the marker is set.

`visiblePlacements()` now sorts only locally queried solid objects into original placement order instead of scanning every non-foliage item across the world. Foliage query order, layer/depth ordering, image sharing, local foliage interaction and the 220-item idle-wind cap are retained.

## Checks

- TypeScript and the production build pass.
- All 441 trees in the combined world are reachable from camp, can be chopped with real timed axe contacts and yield collectible logs once.
- 8,952 previously clear road samples and all existing bridge approaches remain clear.
- 1,764 normal-view samples preserve the exact previous visibility/order contract. Peak visible objects remain 310; the largest new-only sample contains 63 objects.
- Serialized layout is 919,641 bytes, within the 2 MB save limit.
- Owner-edit preservation, deleted placements, version validation, district reservations and bounded shared textures pass.

Run `node scripts/check-world-planting.mjs` for gameplay/geometry/culling checks and `node scripts/render-world-planting.mjs` for actual production CanvasKit software captures. The overview also checks a view containing all 4,153 objects. Browser GPU and physical iPhone FPS have not been measured; software captures are visual QA, not a device performance benchmark.
