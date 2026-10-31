# Original camp walls restored with matching gates

Restores the owner's eleven original wall placement records from the pre-redesign revision-64 snapshot exactly, including position, scale, rotation, mirrored state, layers, collision outlines and stable IDs. The original painted oak artwork and ground footings are retained. Six new rope-bound wooden gates fit the original road openings and their wall end posts.

The version-3 migration replaces the previously generated perimeter, preserves the current camp's 1,357 non-wall placements exactly, and saves through the existing authenticated editor flow on refresh. No production database snapshot is overwritten. It accepts pre-redesign, version-1 and version-2 saved camps; repeated loading preserves subsequent owner edits and removals.

The original wall assets return to the asset picker. Superseded perimeter artwork remains in the runtime registry so existing saves can validate before migration, but is hidden from the picker.

Generated gate sources and exact built-in image-generation prompts are in `artwork-archive/camp-gates-classic-v1`. `scripts/package-classic-camp-gates.mjs` crops transparent margins, registers hinge/post locations and emits the gate assets and placement plan. Post anchors match the painted ground contact. Jagged gate leaves omit the flat top-cap projection that created floating strips.

## Checks

- Exact restoration of all eleven original records and preservation of every non-wall placement.
- Six gates: open from either side, closed sprint/dodge blocking, walkable open route, pathfinding, safe closure around the player, mirrored/rotated collision and persistence after removal.
- Saved layouts validate before and after migration, which is idempotent.
- Production Worker checks use disposable local SQLite, including saves, stale-write rejection and recovery from an empty cached draft.
- Actual shared software Skia renders review the whole camp, six open/closed entrances, restored walls and unchanged structures with no omitted placements.
- TypeScript and production build are required before publication.

Browser and physical iPhone verification were unavailable; render images are from the shared game renderer.
