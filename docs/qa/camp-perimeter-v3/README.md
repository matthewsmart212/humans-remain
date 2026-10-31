Camp perimeter rebuild — 13 October 2026

The current revision-64 camp is migrated once from eleven disconnected old fence placements to 32 connected stockade modules, 16 fitted joints, and six hinged double gates at the northwest, northeast, west, southwest, south and southeast paths. The old wall artwork is retired from the palette but retained in source/history. All 1,357 non-wall placements retain their original saved data, including all 1,335 foliage placements and eight puddles. The expanded outer walking bounds remain intact.

New hand-painted wall, gate-leaf and post artwork was generated with built-in ImageGen. Source images and exact prompts are in artwork-archive/camp-perimeter-v3; runtime images are in public/survival/camp-perimeter-v3. Generated sprites are mechanically registered along a closed ring. Near-vertical runs use upright generated log sprites so they retain thickness. Sloping walls and gate leaves sort in strips against the player's ground position. New bunker and warehouse ground-edge artwork matches ochre terrain; their original architectural pixels, footprints and bunker animation frames are preserved. Structure sources/prompts and pixel checks are under artwork-archive/camp-perimeter-v3/structures; runtime sprites are in public/survival/camp-structures-v3.

Gate controls: approach either side and tap Open gate / Close gate, or press E. Gate leaves swing over 0.72 seconds with matching moving blockers. The entire sweep is checked before motion, and a moving gate pauses before touching an actor. Gate state is local to the running world and survives bunker travel; restarting Play resets it. Authoring data is never changed by opening a gate. One-time perimeter markers preserve later owner moves/removals and are validated on the server.

Verification performed:
- TypeScript compilation and production build pass.
- check-camp-perimeter.mjs: 1,276 samples along the closed boundary, all six gates opening from both sides, open paths, closed sprint/dodge blocking, safe closing, transformed gate collision, alternate server asset-map dimensions, immutable drafts, one-time migration, and preservation of nonwalls.
- check-camp-perimeter-server.mjs: production Worker with disposable local SQLite accepts all new assets, preserves markers/removals, rejects invalid/stale writes, and exposes new catalogue artwork.
- check-world-editor.mjs: authoring, collision, interaction and save/apply/reload checks.
- check-scene-travel.mjs with the migrated full camp: actual bunker stairs and doorway, six round trips, preserved gate state, transformed portals and safe arrival.
- check-puddle-server.mjs: unchanged water persistence contract.
- Shared software Skia renderer: complete camp, all six open/closed gate views, bunker, warehouse, remaining camp props, inner clearing, headquarters and outer boundaries. No artwork omitted. Images and render-report.json are in after/.

Verification limit: browser-control infrastructure was unavailable. These are the actual game engine and shared Skia renderer, not a physical iPhone/Safari session.

Fixtures are read-only QA snapshots; they must never overwrite the owner's live draft. The deployed client applies the approved perimeter change to the current camp and saves through the existing owner-authorized revision check.
