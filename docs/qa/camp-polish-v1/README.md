Camp polish and 600px walkable border
===================================

Reviewed the live camp at revision 63, including all 25 non-foliage/non-water
placements and all remote uploaded artwork. Read-only fixtures are retained
here; they are never uploaded over a newer owner draft.

Changes
-------

- Reduce the authored water field from 20 to 8 placements with a one-time
  version-2 migration. Preserve owner-created water, subsequent deletions,
  and every surviving placement's coordinates, scale, layer and blockers.
- Repaint eight original wall pieces with warm illustrated oak, quieter
  grain, readable ropes and moss. Register each alpha silhouette back to
  its original occupied bounds and transparent canvas. Retain stable IDs,
  source guards, anchors and world dimensions.
- Add narrow ImageGen soil transitions around wall/building foundations
  and subtle renderer contact shadows on the 24 placed structures/props.
  The separate clearing is terrain, so it receives no object shadow.
  Well and treatment-tent artwork already includes dirt at its feet;
  these get contact shadows without another soil patch over the walkways.
- Preserve the existing terrain and all 1,335 foliage placements. Open
  600 terrain pixels per side of the existing scenery at the original
  scale. Walkable bounds change from 3600px square to 4800px square.
  The old centre remains the exact same size and location.
- Apply the expanded bounds to movement, pathfinding, placement, spawn
  validation, cameras, overview, minimap and lightning. Preserve separate
  interior dimensions and the movement bounds of custom terrain.

Validation
----------

- `check-camp-polish.mjs`: 8 puddles, unchanged surviving placements;
  walk, sprint and dodge on all four edges; negative-coordinate navigation
  around a blocker; custom terrain/scene bounds; both game/editor cameras;
  original terrain registration and a contact profile for every placed prop.
- `check-puddles.mjs`: transformed wet areas, walking/sprinting strength,
  no idle or blocked-motion splash, settling, bounded effects and deletion.
- `check-world-editor.mjs`: shared editor/game geometry, save/apply/reload,
  services, collision transforms and conflict protection.
- `check-scene-travel.mjs` with current artwork/layout fixtures: actual
  mirrored bunker placement, opening animation, entry/return, six round
  trips, portal transforms, safe arrivals and independent indoor dimensions.
- `check-terrain-perimeter.mjs`: unchanged registration and tile seams.
- TypeScript and production build. Built-Worker save/reload checks cover
  negative-coordinate spawn, outskirts placements and migration version 2.
- Shared software Skia renderer: full camp, all 25 props/walls, headquarters
  interior, fire clearing, southern paths and all four outer edges. No
  remote artwork was omitted.

Limit: no physical iPhone or browser interaction/performance test in this
environment. Screenshots use the actual shared game renderer.

The older broad `check-art-imports.mjs` suite stops at its retired
`base_shelter_t4` upload fixture (HTTP 400 instead of 200). The unchanged
pre-update test reproduces the same failure. The production Worker tests
for this update's puddle marker and expanded-coordinate persistence pass.

Original image-generation inputs, prompts and mechanical registration are
in `artwork-archive/camp-polish-v1/`. Runtime images are in
`public/survival/camp-walls-v2/` and `public/survival/camp-foundations-v2/`.
