# Circular wall runtime and native verification

This check uses the captured revision-78 world and its 15 artwork records in
this directory. The final authored migration has 4,548 placements and 16
registered circular wall sections. It does not write the hosted world or a
player's saved expedition.

## Reproduce

Run from the repository root with its locked web dependencies installed:

```sh
npm run typecheck
node scripts/check-circular-wall-runtime.mjs
node scripts/check-circular-wall-native.mjs
```

The runtime check defaults to this directory's original source-world and
source-artwork fixtures. An optional first argument can select another directory
containing those two filenames. It deliberately starts saved-run checks from
the original perimeter, rather than the already migrated native snapshot.

The native check reads the generated native snapshot and bundle. To regenerate
them, first explicitly refresh `.qa/native-world/world.json` and
`.qa/native-world/artwork.json` from the approved source fixture, then run:

```sh
node scripts/prepare-native-assets.mjs
```

Generation was rerun after the saved-artwork compatibility fix. It produced
4,548 placements, 1,843 bundled image URLs and 1,881 protected asset files.

## Runtime implementation

- The catalogue and world registry share the final 16-section artwork metadata.
  Each section has its actual crop dimensions, normalized anchor, local ground
  curve and closed annular collision polygon. Road endpoint posts retain their
  small separate footprint polygons.
- The renderer examines the complete ground polyline for player depth and
  obstruction fading. A visible wall section still uses one image draw. Stable
  ordering keeps overlapping posts consistent, including the northern sequence
  15, 16, 01, 02. Independently moved editor pieces do not inherit the original
  circle's ordering group.
- Continued expeditions receive the perimeter migration without rebuilding the
  rest of their world or resetting resource, repair, health or day progression.
  Only a player/spawn/return landing newly covered by changed geometry can move.
  Safe-ground search proceeds outward in six-unit rings, up to 480 world units.
  If a required point has no safe nearby ground, the entire perimeter update is
  deferred with the old layout, player and route unchanged.
- Both web and native restore prepare the saved camp's own image requirements,
  including when the active save is inside the bunker. Autosave stays blocked
  during that preparation and scene restore. An image failure leaves the saved
  expedition intact and the game paused with the existing restore error notice.
- The native offline bundle retains 24 legacy wall image URLs: eight original
  timber walls, eight existing tier variants and eight ground foundations. A
  deferred or owner-edited camp therefore keeps its visible legacy artwork.

## Passed checks

The web TypeScript check passed. The focused runtime check passed against the
final artwork and original revision-78 fixture:

- All 16 IDs are unique, resolve local images and generate polygon collision.
- Full-curve depth/fade behaviour is exercised with an independent bent curve,
  the northern and southern wall faces, and both east/west sides.
- Actual draw-call order retains the approved section seams; off-screen walls
  are culled, and moved editor pieces are grouped independently.
- Continued camp and bunker runs retain their resources, health, gear, cycle
  and progression. The occupied-wall fixture moves to clear ground by 60 world
  units; reopening that migrated save does not move it again.
- A deliberately obstructed return landing defers the migration without
  applying an earlier planned player adjustment. Artwork preparation for that
  saved interior includes every original wall actually placed in its camp.
  A failed artwork load rejects without rewriting the snapshot.

## Native proof images

`native-verification.json` records actual decoded image dimensions, all legacy
wall URLs, snapshot counts and generated picture sizes. The native check passed
fully offline. It exercises the production native image loader, texture warm
queue, picture recorder, shared world draw code and terrain streams through the
existing CanvasKit platform shim.

The three saved PNGs were opened and visually inspected:

| Image | Pixels | View |
| --- | --- | --- |
| `native-wall-844x390.png` | 844 × 390 | Landscape, survivor in front of the northern join |
| `native-wall-390x844.png` | 390 × 844 | Portrait, same join and survivor position |
| `native-installed-camp-overview.png` | 1500 × 1500 | Entire installed camp, editor camera centered on the hearth at zoom 0.23 |

The northern timber/stone joins are continuous in both orientations. The
survivor, surrounding terrain and buildings render normally. The overview
shows the whole circular perimeter and the six retained road openings.

These are images from the production native renderer running with CanvasKit
software Skia, file-backed Expo Asset and PixelRatio 2. They are not browser
screenshots or physical-device captures. A full native typecheck and Expo/iOS
build could not be validated because this checkout lacks the native Expo
dependency set and `expo/tsconfig.base`. Physical-device rendering and GPU
performance remain untested by this focused check.
