# Camp-to-river planting

Extends the western camp outskirts across the open strip shown in the user's screenshot, up to the existing river and stream. No terrain, water animation, roads or existing placements are replaced.

- 56 choppable trees: 26 birches, 12 rowans, 11 oaks, 6 pines and 1 willow.
- 424 walk-through foliage clumps, including small broken riverside reed/sedge drifts.
- 54 rock placements and 7 fallen logs/root snags.
- 20 irregular inland pockets, with open meadow, path shoulders and bridge approaches between them.

The woodland uses cooler ferns, ivy and moss; meadow edges retain dry grass, bracken and restrained amber colours. Wetland plants stay near the stream and banks. Tree crowns, not just trunks, are screened against water and road samples. No planting is added across the main river.

## Delivery and owner edits

`addApprovedCampRiver` runs once on the selected editor draft after the existing camp updates. `campRiverVersion: 1` is validated and preserved through cloud saves, local drafts and import/export. Each placement remains editable. Deleted or moved additions do not regenerate. New owner-built obstacles take priority over the authored positions. The existing owner-authorized save flow persists the expansion when the editor loads; publication itself does not overwrite the shared map record.

The pass was authored against saved revision 69 (1,758 items), and preserves all of them. The resulting reviewed layout has 2,299 items. Harvesting uses the existing axe, notched/stump states and manual log pickup, without changing the existing session reset rules.

## Verification and rendering costs

All 56 new trees are reachable by flood-filling the actual collision map from camp, and pass real timed axe contact plus log-pickup checks. 3,595 sampled road points retain their previous clearance; bridge traversal and water setbacks are checked separately. Tests cover owner construction, move/delete preservation, repeat loading, terrain scope, inventory capacity and reset behaviour.

Only seven additional shared image URLs are needed: 959,490 compressed bytes and 9.55 MiB decoded when all seven are loaded. The surveyed 1,600 × 1,000 world-unit views contain at most 118 new objects. Existing spatial culling and the foliage animation cap remain unchanged. Placement authoring happens offline, never in the frame loop.

Production CanvasKit software captures are in `docs/qa/camp-river-v1/`. These are visual checks, not browser GPU or physical-device frame-rate measurements.
