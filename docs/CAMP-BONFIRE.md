# Camp bonfire and oak well

Replaces the three hearth tiers with a stacked-timber bonfire and matching upgrades. Each lit/unlit sprite is 1024 × 1024, uses the same [512, 960] ground pivot and keeps established placement dimensions and collision geometry. Eight hand-painted flame frames run at 10 fps; flames pass behind the timber and a smaller flame passes in front. The ground clearing is a separate drawing pass under assets and the player. It adds no collision.

The well matches the headquarters' weathered oak shingles. The known uploaded well is reskinned without changing its saved dimensions or anchor; future user uploads take priority. On opening this specific existing camp, a one-time addition places the well at (2740, 1330), beside the eastern circular road. It leaves all 21 existing placements unchanged, checks the area for blockers and locks the new well. A persisted version marker prevents duplicates and respects later removal. The editor saves this addition through the existing owner-authenticated, revision-checked endpoint when available; otherwise the updated draft stays local for the owner to save. No authentication or access rules change.

In survival, one raw meat is tossed into the bonfire, cooks for six seconds, then arcs onto a reachable clear spot. Cooked meals use the existing four-meal inventory and can be collected with a full resource backpack. Food cannot be collected in flight or twice. Existing meals survive the dawn resource refresh. If the landing area is blocked, the finished meal waits until there is space. World Builder's Walk mode offers **Try cooking**, using sample meat only in the editor preview, then **Collect meal**.

## Artwork

- `artwork-archive/bonfire-v3/`: original generated masters, prompt set and registration details.
- `public/survival/bonfire-v3/`: registered runtime frames, ground clearing and food sprites.
- `public/survival/camp-well-v2/oak-well.webp`: matching well.

Generated with the built-in image-generation tool; Sharp handles mechanical cropping, registration, compositing and runtime encoding. Original generated files remain preserved. Superseded hearth runtime folders are retained in source history and omitted from the deployment package.

## Verification

- `npm run typecheck`
- `node scripts/check-painted-hearths.mjs docs/qa/bonfire-v3`: fixed canvas, unlit alignment, invariant structure pixels, unique flame frames, unchanged placement/collision and legacy aliases.
- `node scripts/check-camp-centrepiece.mjs`: current camp fixtures, one-time placement, no user placement changes, removal persistence, walking circuit, well approach/drinking, raw-meat consumption, cooking, safe landing, collection, meal capacity and eating. Reads the public layout/artwork snapshots from the parent scratch directory.
- `node scripts/check-camp-essentials.mjs`: well replacement and imported-art compatibility, future-upload priority and the unchanged treatment centre.
- `docs/qa/bonfire-v3/actual-camp.webp`: actual CanvasKit world renderer with the current uploaded headquarters and walls.

Browser/iPhone Safari interaction was not available in this environment. Rendering and simulation were checked directly, and publication uses the native Sites deployment workflow.
