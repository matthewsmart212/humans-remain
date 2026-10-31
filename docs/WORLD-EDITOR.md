# Desktop world editor

Open WORLD EDITOR from the main menu (`#editor`). The library contains 105 unique pictured asset definitions, deduplicated by image and source crop while retaining meaningful gameplay variants. This is a layout tool; placing an illustration does not implement an unbuilt checklist feature.

Drag an asset onto the terrain or select it and click the ground. Select a placement to move, duplicate, remove, resize or adjust its ground collision. Undo/redo, grid snapping, collision display, camera zoom/pan and worker spawn placement are available. Walk mode uses the existing worker controller and renderer at gameplay scale. Time stays in daylight; survival damage, resource depletion and combat do not run in the editor.

Drafts auto-save to the device and can be exported/imported as versioned JSON. The signed-in Site owner can save the shared draft or apply it. Apply validates required services and clear interaction points, then updates new survival runs; it does not replace a running shift. Concurrent cloud saves use an atomic revision check. Public users cannot write the shared layout. World options restores the original game camp without deleting the draft.

The optional starter kit places a generator/workshop, hearth, well, shared storage, lamp, three resource pickups and two animal spawns. Other art defaults to a visual prop unless it maps to existing prototype behaviour. Essential services require exactly one assigned placement before applying. New artwork does not automatically introduce upgrades, farming, medical or gate systems that are not implemented yet.

## Rendering and placement

- `world-assets.ts` is the shared registry: source references, crop, scale, anchor, ground bodies, optional wall segments/interior/roof/front layers and default game role.
- `world-layout.ts` holds the versioned format, validation, spatial collision index and save client.
- `placed-world-renderer.ts` renders editor and applied game objects with the same anchors and layering. Three shelter tiers have doorway geometry and automatic roof cutaway.
- Applied layouts replace default placed props, building geometry and service coordinates while retaining permanent terrain boundaries. Reserved blank space is not collision. Destroyed crates lose their ground collision.
- Existing web and native entrypoints load the public applied layout before starting a new run. Native loads missing artwork from the same Site and caches the last layout.
- `server/world-layout.ts` persists draft/applied JSON in D1, with owner checks, origin validation, size/asset validation and compare-and-swap updates.

## Terrain resolution

The current texture is `home-terrain-hd-v2.webp` at 3042 × 4056, rebuilt from nine detailed overlapping image-generation sections. The original 1086 × 1448 `home-terrain.png` remains available as a reference. The new image contains 7.85 times as many pixels, with regenerated leaf, stone and ground texture. World dimensions, worker scale, saved placement coordinates and collision data remain unchanged. `terrain-art.ts` centralises the current image URL and dimensions for rendering and previews.

## Verification — 6 October 2026

- TypeScript check and production build.
- `scripts/check-world-editor.mjs`: asset uniqueness and source existence; starter services/resource/food setup; route accessibility; moved services; removal of old collision; custom crate footprint/destruction; shelter door entry; invalid layout rejection; real SQLite-backed save/apply/reload, owner/origin protections and concurrent-save conflict; original-camp restore.
- Existing `scripts/check-survival.mjs` passed after shared-engine changes, covering collisions, station approaches, interactions, combat and deterministic rounds.
- Managed Chrome preview: library rendering, starter kit, drag/drop, drag/move, remove, undo/redo, keyboard walk and local reload persistence. A non-secure development-origin UUID issue and atlas thumbnail clipping were found and fixed.
- Cloud save/apply logic was exercised against SQLite; the Vite-only preview has no server API, so its cloud buttons are disabled. No test camp was applied to the public game.
- Native entrypoint syntax checked only. Expo device behaviour has not been run or verified.

Preview evidence: `docs/qa/world-editor.jpg` (local preview, showing the expected cloud-unavailable status).
