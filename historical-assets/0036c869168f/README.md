# Wall ground artwork

`painted-earth.png` is the image-generated source texture; `prompt.txt` records the generation instructions. `scripts/prepare-wall-ground.mjs` masks it to eight individually traced wall footprints, adds soft contact shading, and trims unused transparent canvas. Regenerate from the repository root.

Each bed is registered to the original HD wall canvas in `src/wall-ground-art.json`. The three tiers of a piece share one bed. The original 24 wall images, placement IDs, dimensions, anchors, rotation/mirror pivots, layer settings and collision geometry are unchanged.

Both the editor and game draw these beds immediately after terrain and before all placed objects and the player. Ground does not become selectable or solid, does not participate in object layers, and does not fade when a wall reveals the player. Existing saved and local placements receive it through their asset IDs; no cloud layout rewrite is needed.

Validation: `node scripts/check-wall-ground.mjs` checks all 24 variants, 128 transformed draws, tier alignment, editor/game ordering, soft alpha edges, image loading and mobile texture size. `scripts/render-wall-ground.mjs <artwork-snapshot.json> <layout-snapshot.json> <output-dir>` renders the actual saved placement data for all three tiers and individual-piece visual review. The original wall art remains byte-identical.
