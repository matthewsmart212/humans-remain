# Fixed-placement tiers

Select an object in Edit mode, open **Object** on mobile, then choose its tier above the layer controls. Tier changes remain possible while the object is locked. They are draft edits: Save retains them, Apply uses them in new game runs, and Undo/Redo works normally.

## Placement invariants

The first tier change captures an unscaled width, height, normalized anchor and reference-geometry asset in `Placement.frame`. Subsequent changes replace only `assetId`; placement ID, coordinates, scale, rotation, flips, layer, roof setting, role, solid flag and custom blockers remain intact. Both the editor and game renderer use the frozen destination rectangle. Default collision geometry, interior tests and inherited transparency use the original geometry asset. Animated/unlit hearth states use the same fixed destination.

The optional field is accepted and retained by the existing layout validator and D1 JSON save/apply pipeline. Legacy layouts need no migration and are not rewritten on deployment. Changing a tier is a single history entry, even for an entire perimeter. Images must finish loading before committing; failed loads or concurrent draft changes abort the operation.

Checklist families supply item tiers. Only tiers with actual registered artwork can be chosen; missing ones say “Artwork needed”. This is editor artwork selection, not a new resource-cost or automatic gameplay-upgrade system.

## Linked walls

The eight stable Base wall custom asset IDs remain the unchanged Tier 1 artwork. Tier 2 reuses the previously approved complete palisade; Tier 3 reuses the stone-footed/spiked version. Each is split clockwise into its matching eight segments and registered on the existing HD sprite's canvas and occupied bounds. These are reused illustrations, not newly generated high-definition designs. Source references and registration data are retained under `artwork-archive/wall-tier-sources`; `scripts/prepare-wall-tiers.mjs` reproduces the packaged WebP variants.

All placed instances of those eight pieces participate, including repeated, mirrored, rotated and locked copies. A change is all-or-nothing, and newly placed wall pieces inherit the perimeter's current tier. This does not group spatial dragging or change any exits or blockers. The live layout and artwork database are never mutated by deployment.

## Verification

- `node scripts/check-world-tiers.mjs`: deterministic fixture; 38 available checklist transitions, 11 linked wall copies, 16 variant image canvases, repeated round trips, exact bounds/transforms/colliders, loading races/failures, missing art, locked items, one-action undo, SSR controls and all 48 lit/unlit hearth destinations.
- The same script accepts an artwork-response JSON and layout-response JSON to check a read-only snapshot. The current 13-object draft was checked this way without saving it.
- It also tests the actual D1-backed handler with local in-memory SQLite: owner/origin guards, stale revision rejection, draft save, game apply, frame retention and fresh asset-map reload.
- `node scripts/check-world-editor.mjs`: existing collision, doorway, selection, transforms, roles and save/apply regression suite.
- `node scripts/check-art-imports.mjs`: existing built-server artwork and layout integration tests.
- `npm run typecheck` and the production build.

Mobile controls reuse the existing scrollable inspector with 48px tier targets. Physical iPhone/Safari interaction was not exercised in this environment.
