# Humans Remain: current authored game

Web Play and the Expo app use `createCampPlaySession`, `stepCampPlaySession`,
`drawWorldEditor`, the Scrap Runner renderer, placement collision, chopping,
contact-only foliage, lighting/weather, scene travel and terrain stream budgets.
The obsolete factory/packaging screens and their texture preloads are removed.

## iPhone

Keep `native`, `src` and `public` together. Open the project folder in Cursor,
then run:

```sh
cd native
npm ci
npx expo start
```

Use an Expo Go version compatible with this project's Expo SDK 57. A development
build can be launched with `npm run ios` on a Mac with Xcode and signing set up.
The web editor does not run inside the native game. The app opens a clean game
menu with Continue and New Survival run, then the painted field-kit HUD. Rotation clears held controls;
backgrounding pauses the game.

## Field-kit controls

The same generated survivor badge, enamel rims and painted icons are used on
web and native. All four vitals start as icons with percentages in one slim
horizontal row beside a 40×40px survivor portrait. Tapping expands the original portrait, live health/stamina meters
and canvas food/water tabs; tapping again collapses it. The left thumb only
moves. The right thumb has a fixed
64-point round action and three reserved 46-point support positions: Sprint
north, Dodge north-west, Tool west. Sprint is a toggle. Dodge and the quick
tool control appear during nearby combat, with a short grace period before
they hide. Hidden controls do not move the remaining targets.

The main action changes between Cut/Punch, Open/Close, Cook, Drink, Collect and
Attack. Combat takes priority over nearby containers. A selected interaction
gets a small ground marker and its name in a tooltip left of the action. The action is locked
from press until release; held cuts cannot become chest interactions. A stale
target, a target that moved out of reach, or a callback from an old scene/run
cannot act on another object. Pointer capture/cancellation and native touch
identifiers keep the action thumb independent of movement and world pinch.

The backpack shows actual carried supplies, cooked meals and tool selection
in selectable RPG slots. All/Food/Materials/Gear filters lead to item details,
actual axe damage and stamina costs, and meal recovery values. Use equips or
stows the axe and eats cooked meals; meals can heal even when food is full.
Drop 1 and Drop stack place items on reachable clear ground for collection.
Whole collected bundles retain their capacity accounting, partial drops keep
the remaining bundle's slot, and recollecting scrap cannot inflate its score.
Blocked drop searches leave inventory untouched. The starting axe stays owned.
Food uses the existing world artwork; two small generated scrap/fuel sprites
are shared by the bag and loose ground pickups, including offline native play.
The expanded health and stamina group is centred in its painted panel.
Opening it suspends simulation and clears held controls. It scrolls on short
landscape screens. On keyboard, WASD/arrows move, Space uses/holds the main
action, E taps it, Shift sprints, Q dodges, 1 equips/stows the axe, B opens the
backpack and Escape closes it or pauses. These controls replace the old Play
widgets; editor Walk preview keeps its own existing controls.

Pinch with two fingers on the world to zoom between 100% (the original camera)
and 70% (30% out). Web also accepts trackpad pinch, including Safari gestures.
The camera keeps following the player, and HUD/controls keep their original
size. Joystick and action-button touches are excluded from the pinch. Zoom
persists through scene travel and pause; restarting a run restores 100%.
Gesture updates write directly to the camera used by rendering and streaming,
without React updates for each gesture sample. Editor zoom remains independent.

The app first requests the latest **saved draft** from the editor. Press Save
in the web editor to sync world changes to iPhone. Unsaved browser edits and
browser-local weather/time preferences do not sync. Native starts in daylight
and clear weather. A successfully loaded layout and artwork metadata are cached
together. The included 4,465-placement snapshot also works on a first offline
launch. New remote artwork is downloaded and cached on demand. If it cannot
load, the previous complete world or bundled snapshot remains available.

Runs use a copy of the authored world: restarting resets the run without
modifying the editor draft. Survival progress now saves locally on this device, including the active scene and bunker return route. The testing sandbox has a separate disposable session. See [the first expedition](FIRST-EXPEDITION.md) for progression, saving behavior and current validation.

## Rendering and cleanup

The top-left vitals keep a 40×40px survivor portrait beside a slim
192×40px painted stats panel: one row of health, stamina, food
and water icons with live percentages. The touch area is 44px high.
The original badge artwork is reused
for both sections, preserving its canvas, enamel, stitching and repairs.
Both sections share the same 40px image height and source-artwork join, using
shared geometry on web and native to keep the borders aligned. Tap it to expand
the original portrait-and-bars panel; tap again to collapse. This works with
touch, keyboard and assistive activation without sending an action to the game.
Sprint sits 10px lower in the right-thumb arc. Context names such as Camp well
and Cooking fire appear immediately left of the main action as its tooltip.
Both web Play and the native HUD use the same arrangement.

The renderer records one Skia Picture for the scene. HUD data is sampled every
100 ms in an isolated component; React updates only when displayed values or
context change. The game root no longer rerenders on a HUD timer. Native
joystick movement uses Reanimated values. Simulation
uses fixed 60 Hz steps with player presentation interpolation. Paused scenes
are recorded only when artwork, world or viewport changes; background apps stop
the frame callback. Decode work shares a three-job priority queue. One new
texture per animation frame is prepared on a reused offscreen surface before
it becomes visible. Distant road/camp/river chunks are evicted with the same
lookahead, screen-density thresholds and byte budgets used by web Play.

The four full camp quadrant textures are no longer preloaded: the current
renderer uses the original overview plus the full-detail terrain chunks.
This avoids retaining a second copy of the same ground in memory. Current
artwork pixels, crop registration, tree states and placements are unchanged.
Images referenced by submitted Pictures remain owned until Skia/JS can release
them safely. Contact/recovery plants use deformation; idle foliage uses the
ordinary sprite path.

`docs/ASSET-CLEANUP.json` records removed files and byte totals. Cleanup protects
the saved world, current editor palette, animation/chopping states, available
wall tiers, current enemy sheets and terrain/river manifests. Historical source
paintings and retired modes remain recoverable in Git history. No uploaded
artwork storage or saved editor data is deleted.

The river quality update is described in [RIVER-QUALITY.md](RIVER-QUALITY.md),
including registered material detail, lossless chunks and the unchanged river
texture budget.

## Validation

```sh
npm ci
npm run typecheck
node scripts/check-native-authored-world.mjs
node scripts/check-clean-play.mjs
node scripts/check-field-kit.mjs
node scripts/check-play-zoom.mjs
node scripts/check-contact-foliage-performance.mjs
node scripts/check-terrain-streaming.mjs
node scripts/check-scene-travel.mjs
cd native
npm run typecheck
npm run export:ios
```

Native rendering checks run the production native recorder/image queue through
a CanvasKit software shim in portrait and landscape. Metro's iOS export checks
native module resolution and bundled assets. Neither check measures physical
iPhone frame rate, GPU upload latency, memory pressure, audio, Expo Go device
compatibility or sustained thermal performance. Those require a device build.
No IPA, Apple signing or TestFlight upload is included.

Field-kit checks exercise actual web pointer and native touch handlers, all
context transitions, captured actions and target validation, and safe-area
geometry at narrow phone, portrait, landscape and tablet sizes. Its software
layout proofs paint the native component tree/styles with a small Canvas2D
adapter over the Skia world. These are layout/artwork proofs, not browser or
physical-device screenshots. All 18 UI textures total 1,808,784 decoded bytes;
their rings have transparent centres, and idle controls do not animate.

To refresh the bundled snapshot, put fresh world-layout and world artwork API
responses in `.qa/native-world/world.json` and `artwork.json`, then run
`node scripts/prepare-native-assets.mjs`. Review the generated inventory before
running cleanup. Do not run historical art-generation scripts against the
cleaned runtime tree.
