# Circular camp wall installation

The approved spiked timber wall with a low mossy stone base replaces the old
camp perimeter. Six road entrances remain open. The installation uses sixteen
orientation-specific sprites on a 1,650-world-unit circle centred on the camp
hearth. Eleven sprites have finished road ends; five reuse the approved
closed-circle kit unchanged.

## Source of the world

The installation was checked against the production editor's revision 78,
updated 2026-10-31T18:17:30.675Z: 4,543 placements and 15 artwork records.
The read-only fixtures are in `docs/qa/circular-wall-v1/`. The native snapshot
contains this world with the approved wall migration applied: 4,548 placements.

`addApprovedCampPerimeter` performs a one-time version-5 migration when an
eligible camp is loaded. It replaces eleven old wall placements with sixteen
new ones, preserves every building, and moves only two audited rocks and one
apple tree 160 units outward when their original properties are unchanged.
Other placements and subsequent version-5 editor changes are preserved.
Publication does not replace the hosted database with the test fixture.

Continued survival runs migrate their own camp snapshot. Player position,
spawn, and camp return landings move to nearby clear ground only if the new
wall or the three moved scenery pieces newly occupy them. If no safe nearby
landing exists, migration defers and keeps the existing run and wall intact.
Inventory, camp progress, health, time, and other run state are retained.

## Runtime and assets

- `src/camp-circular-wall-layout.json`: exact placements, road openings, and
  narrowly scoped scenery adjustments.
- `src/camp-circular-wall-art.json`: image registration, ground curves,
  collision polygons, and draw order.
- `public/survival/camp-circular-wall-install-v1/`: eleven new runtime sprites
  in PNG and lossless WebP form.
- `public/survival/camp-circular-wall-v1/`: the approved original kit, including
  the five reused pieces.
- `artwork-archive/circular-wall-install-v1/`: raw generations, exact prompts,
  geometric guides, reproducible image registration, previews, and inventory.
- `native/bundled-art.ts` and `native/assets/world-snapshot.json`: matching
  native artwork and world data.

The map derives the wall from its actual placed curves, so moving or deleting
pieces in Build is reflected on the map. Collision follows the curved stone
base and the entrance posts. The shared renderer uses one image draw per visible
section, accounts for nearby player depth, and fades a wall that obscures the
player. Legacy artwork remains available for older/custom layouts. Restoring a run loads
the saved camp’s own image set, including deferred legacy walls and both wall
tiers. The native bundle retains their foundations as well.

## Focused verification

From the project root with the locked web dependencies installed:

```sh
npm run typecheck
node scripts/check-circular-wall-layout.mjs
node scripts/check-circular-wall-runtime.mjs
node scripts/check-circular-wall-native.mjs
node scripts/check-camp-perimeter-server.mjs
npm run build
```

The server check requires Node 24's `node:sqlite` and uses an in-memory test
database. It does not write to the hosted game. See
`docs/qa/circular-wall-v1/VERIFICATION.md` and the accompanying JSON reports for
the exact checks and results.

The browser review page is development-only:
`/scripts/circular-wall-qa.html`. It renders the captured world through the
production Skia renderer and is not included as a production entry point.
The saved native proof images also use the production renderer, with CanvasKit
platform shims. They are renderer captures, not physical-device screenshots.
The complete Expo dependency set is not installed in this workspace, so a full
native typecheck, iOS build, and physical-iPhone test were not completed here.

The new assets need no external service or environment variable. Existing
project services and local development instructions are unchanged. GitHub's
existing Git LFS rules cover the binary artwork; run `git lfs pull` after cloning
if the checkout contains LFS pointer files instead of image data.

The publish build includes the sixteen lossless WebPs referenced by runtime
metadata. Editable PNG duplicates, manifests, and unused closed-ring pieces
stay in the source project and GitHub, outside the deployment archive. The
build asserts that every required wall image remains present.

To meet the host's separate expanded-archive limit, the publish build also
omits the unused original `maps/world-terrain` export, the superseded v2 walker
atlas, and the specifically listed historic `art/*.webp` minigame images. Their
original files remain in source. The active illustrated map, v3 walker, and
`art/grain.svg` texture remain published. These exclusions were checked against
source, native registrations, compiled JavaScript/CSS, and public manifests.
