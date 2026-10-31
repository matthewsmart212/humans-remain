# Scrap Runner animation

Gameplay and the World Editor share `drawWorker`. The approved directional
cycles still use complete painted poses. The eight affected direction/gait
combinations now use two complete painted leg layers beneath the original
body/arm animation. The original standing poses and directional punches remain.

## Alternating legs

Walking east, west, southeast and southwest, and sprinting on all four diagonals,
previously repeated drawings with the same anatomical leg leading. Changing
frame order did not repair that source-art problem. `runner-leg-motion.ts`
gives each leg its own fixed hip and offsets their phases by exactly half a
cycle. The leading foot switches on each half-cycle, with a low return lift,
and a short stride. Walking and diagonal sprinting hold four distinct poses in
sync with their existing body/arm frames, matching the stepping rhythm of the
approved directions. Neither gait blends through intermediate leg positions.
The four repaired walking directions use a 16-unit forward/back reach (previously
11), separating the lead and trailing foot more clearly without changing timing.
West-facing views mirror the matching east-facing renderer.

Walking north, south, northeast and northwest and sprinting north, south, east
and west retain their exact original complete sprites and frame ordering.

`scrap-runner-leg-layers-v1.png` contains six isolated painted legs for the three
required views. `register-runner-leg-layers.py` measures source crops and alpha
outlines without rewriting image pixels. Runtime silhouette clipping excludes
the atlas's soft background fringe; the complete boot sole is retained. The
upper trouser area overlaps under the torso, and separate original arm outlines
preserve the rear arm where the old source drawing had an elevated boot behind
it. This is a two-layer leg rig, not the previous sliced-boot/body mesh. The atlas
adds approximately 1.6 MB of downloads.

## Sources and registration

Five transparent 1254×1254 sheets in `public/survival/scrap-runner/` supply
16 source drawings each, from which four walking and four sprinting poses per
view are selected. Extra kick/reach poses are excluded. Right-facing diagonal
and side cycles are mirrored for the three left-facing views. These are
whole-body source cycles. Sprint artwork includes
forward lean, tucked rear legs and raised arms. Sequences are curated per view
for a restrained body/arm rhythm; they do not iterate every drawing on the sheet.
The targeted leg renderer replaces only the unreliable leg portions.

`src/runner-cycle-frames.json` records measured component bounds, head centres
and scales. Grid slicing is unsafe because some complete soles cross nominal
row boundaries. `scripts/register-runner-cycles.py` reproduces the measurements
without altering source pixels. Hair width and top alignment keep the character
registered across frames; full-body crops retain all hair, hands and boots.
The source pose drawings still have small costume/detail variations.

`src/runner-cycles.ts` selects poses from actual distance travelled. A complete
walk cycle covers 160 world units; a sprint cycle covers 200. At full speed,
this gives about 7 walk drawings or 9 run drawings per second. Whole-body
bounce is limited to 0.4 world units walking and 1.1 sprinting, substantially
less than the previous 1.4 and 3.2. The original full poses remain intact.
The five source PNGs add approximately 7.4 MB of downloads.

## Motion and controls

`src/player-presentation.ts` interpolates player position and cycle phase between
fixed simulation updates, including phase wrap, for smooth camera travel on
high refresh rate displays. The authoritative physics state stays unchanged.
Teleports remain immediate. A small directional deadband prevents joystick
noise at a facing boundary from rapidly switching the visible character.

Sprint accelerates to 1.55× walking speed. Changing sprint does not reset the
foot phase. Releasing movement or reaching a wall stops phase advancement and
restores a dedicated planted standing pose. Punch timing is unchanged. Downed
players retain their crawl speed; collisions and combat stamina are unchanged.

Tap Sprint to toggle in gameplay or the editor. Hold Shift on a keyboard.
Pausing, changing editor modes, opening editor panels, losing focus and viewport
interruptions clear sprint input. Multi-touch allows the Sprint button to work
while another finger holds the joystick.

## Verification

`node scripts/check-survivor.mjs` verifies that the near and far feet alternate
which leads along the movement direction, remain half a cycle apart and close
the loop. Walking and diagonal sprinting hold exactly four poses aligned to their
body frames. It protects the eight approved cycles and checks sole
coverage, mirrored pairs, all directional cycles, source bounds,
registration, loop closure, idle/punch selection, render immutability, phase-wrap
interpolation, direction hysteresis, speed, diagonals, blocked movement, downed
movement and multi-touch Sprint activation.

`node scripts/check-locomotion-skia.mjs <output-directory>` renders a 48-sample
cycle through the actual CanvasKit/Skia adapter, at normal and 80% scale.
Add `--run` for sprint or `--detail` for enlarged foot inspection.
`--scenario` runs four seconds of actual movement: idle, walk, sprint, turning,
walk and stopping. Reviewed
walk/run contact frames and terrain overlays locally. Software rendering is
not a physical iPhone Safari test.

`node scripts/render-runner-leg-contacts.mjs <output-directory>` renders the
four corrected view/gait combinations at both contacts and passing phases for
visual checks of leg overlap and the original body/arm silhouette.
