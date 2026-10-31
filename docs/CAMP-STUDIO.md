# Camp Studio

The site now opens one persistent WorldEditor workspace. `#editor` opens Build,
`#game` starts a play session from the current draft, and `#checklist` opens the
full asset library inside that same workspace. The old factory game and home
navigation are no longer mounted by the app.

## State ownership

- `layoutRef` is the authored draft. Local autosave and cloud Save use only this
  draft. Existing cloud revision checks and owner permissions are preserved.
- Play clones the current draft, including unsaved edits, transforms, tiers,
  collision paths and terrain. It requires a clear spawn, but no obsolete
  generator or shared-store prerequisites.
- `editSession` retains the original editor world, camera, zoom, selected object
  and dock visibility. Stop restores those values. Runtime chest, food and
  player state never become world edits or undo entries.
- Restart creates a fresh play session. The retired factory wave, generator,
  wages and results loop is not run. Current camp movement, sprint, axe, roofs,
  collision, storage-chest animation, cooking, food and well interactions run.
- Play begins with three raw meat test supplies and 70% hunger/water so the
  existing interactions can be tried. The Game monitor and Help describe these test supplies; the game HUD shows only gameplay information.
- The library and dialogs suspend simulation/input. Library placement returns
  to Build. Artwork saves refresh the renderer and invalidate open-world
  collision caches without changing placement coordinates or frames.
- Delayed asset loads are cancelled across mode changes, so an outstanding
  placement cannot modify the draft after Play begins.

## Workspace

Desktop uses a scene/assets/world dock, central viewport and object inspector.
The object inspector keeps Remove and Duplicate outside the scrolling settings.
The Scene list selects locked and obscured objects without moving them. Focus,
1-pixel nudges, 1-degree rotation, flip, layers, linked wall tiers, roof settings
and per-instance collision editing are retained.

Touch screens start with both drawers closed. The two toolbars remain available;
only one drawer opens at a time. Walk remains an optional quick preview, and Play
is the main way to try the current world. Library provides existing uploads,
artwork/collision editing and direct Place actions without a route unmount.

Camera controls (zoom, Player, Whole map) sit beside Help in the shared toolbar.
In Play, the left dock becomes a collapsible live Game monitor: measured render
FPS, frame interval, CPU draw time, simulated elapsed time, object/drop/creature
counts, player vitals, movement/position, supplies and actual viewport dimensions.
It samples UI values twice a second without a full workspace render per frame.
FPS uses animation-frame wall time, not the clamped simulation delta. Hidden-tab
and restart samples reset; stale measurements show an unavailable value.

The monitor stays beside the game on landscape touch screens; in narrow portrait
it docks above the game. It never covers the viewport or pauses gameplay. The
Build panels retain their own visibility when switching back. Camera tools remain
visible beside Help while narrower Build tools can scroll; portrait uses two rows.
Pause/Restart remain in the toolbar, while workspace messages, options and errors
occupy a separate feedback row. The game view has no helper text, editor camera
bar, pause-to-build overlay, test labels, spawn markers or selection/collision UI.

## Verification

- `node scripts/check-studio.mjs`: current camp, movement/sprint, blockers, chest,
  cooking/food/water, snapshot isolation, restart and unsaved layout edits.
- `node scripts/check-studio-transitions.mjs`: actual UI handlers for Play/Stop,
  camera/selection/dock restoration, in-session library, Save isolation and
  cancellation of delayed placement.
- `node scripts/check-studio-render.mjs`: desktop and touch initial markup and
  integrated library Place controls; this is not browser visual testing.
- `node scripts/check-studio-monitor.mjs`: real frame measurement at 30/60/120 Hz,
  slow/stale/hidden-tab samples, live stats and monitor input isolation.
- Existing library cleanup, removal and roof-order regressions remain applicable.

Real iPhone Safari visual verification is still needed; no supported browser QA
surface was available for this change.
