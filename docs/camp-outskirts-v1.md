# First camp outskirts planting

This pass expands from the existing camp in 14 irregular woodland, meadow and dry-ground pockets. It keeps the original camp buildings, foliage, roads, terrain, spawn and owner edits.

- 58 choppable trees: 16 oaks, 24 birches, 14 pines, 3 rowans and 1 deadwood tree.
- 288 walk-through foliage clumps, grouped around trees and stone with gaps between pockets.
- 42 rock placements, including walkable pebble patches.
- 4 fallen logs.

The north and west favour oak, birch, ferns, ivy and moss. Southern pockets use open grass, bracken and occasional rowans. The east is sparser, with sage, dry grasses, pine and warm stone. Wetland planting is reserved for a future riverbank pass. Paths, camp entrances and open fighting ground retain their space.

## Loading and editing

The approved pass is added once to the selected camp draft when the editor loads, using the same versioned update pattern as the existing camp foliage. It is saved through the existing owner-only save flow. Existing unsaved local drafts are resolved before the additions are made. Each new item remains individually editable. The saved `campOutskirtsVersion` marker prevents removed or moved items from regenerating. An owner-built obstacle added since the survey takes priority over a planting position.

The current shared world has a draft and no applied legacy-survival layout. This update targets the world editor and its Walk/Play modes; it does not replace that draft with a historical fixture or activate the retired generator game.

## Gathering

Axe hits use the existing intact, notched and stump artwork. Felling a tree drops one collectible bundle of 2–4 logs on the reachable side, depending on the species. Logs require the pickup action; backpack capacity is respected. They use the existing wood resource slot, remain through a day change if uncollected, and cannot be awarded twice by hitting a stump. Wood/log counts are visible in the Play monitor. Session restart restores trees and clears test-session drops.

## Verification

All 1,366 existing placements are preserved. All 58 new trees have a reachable approach from camp using the real collision map, and all passed actual timed axe-contact and pickup tests. 2,509 road sample points retained their existing clear space. Tests also cover deleted or moved placements, newer owner construction, full backpacks and independent play-session state.

The pass reuses 36 additional images (4.67 MB compressed; 51.18 MiB decoded when all are loaded). The surveyed 1,600 × 1,000 world-unit views contain at most 85 of the new objects. Existing spatial culling and limited nearby foliage animation remain in use; placement generation runs offline, not per frame.

Production CanvasKit software captures show the real saved camp plus the additions. Browser GPU and physical iPhone frame rates were not measured.

Authored placements: `src/camp-outskirts-planting.json`. Review captures and before/after snapshots: `docs/qa/camp-outskirts-v1/`.
