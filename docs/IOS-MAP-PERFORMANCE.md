# iOS map performance and diagnostic recording

The 1 November recording averaged 58.3 game callbacks/second, but its worst gap
was 404 ms. The user reports the worst experience while pinching into the map.
The old context only exposed gameplay zoom, which clamps at 0.7: it could not
show how far the atlas was zoomed, or distinguish map work from gameplay work.

## Changes

- A ready, fully opaque atlas suppresses gameplay picture recording and outdoor
  view streaming. Simulation, survival time and attacks continue. Crossfades,
  missing map textures and closing the map keep/restart normal drawing.
- Map terrain and the camp atlas decode while the map component is mounted
  during play, before the pinch threshold. They stay loaded across opening and
  closing the atlas within that play session. This moves decoding earlier; it
  does not promise that iOS has already uploaded textures to the GPU.
- The iOS pause menu exposes FPS, recording, stop and JSON export again, without
  adding an editor or spawn menu. The direct Survival launch is preserved.
- Recording remains opt-in and bounded. No per-frame console output is added.

## Second recording: pinch, raids and streaming

A later 229-second development-build recording on iOS 26.4 averaged 57.9 fps,
with a 315 ms worst frame, 156 frames over 33 ms and 13 over 100 ms. During its
15 pinches (9.3 s), frames averaged 19.5 ms against 17.2 ms otherwise, and 2.7%
exceeded 33 ms against 1.1%. That recorder sees only the JavaScript thread. The
larger pinch stall was on the UI thread, where the canvas replayed the atlas's
engraved vector layer, about 52,000 subpaths, on every move. Without MSAA,
Skia's GPU backend rasterizes large anti-aliased paths into CPU masks, so each
pinch frame repeated that work at the screen's pixel density.

The recording also showed 444 React commits over 4 ms (87 during pinches, at
most 31 ms), mostly the HUD re-rendering for every atlas zoom change; simulation
updates up to 166 ms during raids, from repeated pathfinding grid builds; 284
texture warms of up to 8.8 ms each; and 294 camp texture evictions against 283
requests, so streamed textures were repeatedly dropped and loaded again.

### Changes

- The vector layer is drawn once into 512-pixel raster tiles (`native/map-tiles.ts`)
  on the JavaScript thread, in the time each game frame leaves. While the atlas
  is closed it prefetches the view it opens at. Pinching draws only the visible
  tiles, about 15 to 18 image draws, with finer tiles replacing coarser ones as
  they finish.
- Skia's CPU anti-aliasing misjudges coverage a few pixels inside a clip edge.
  Each tile therefore draws only the subpaths that reach it, with a 32-pixel
  margin, and keeps the inner square. Against 16×16 point-sampled coverage,
  tile edges measure more accurate than the previous whole-layer picture.
  Batches keep their fill-then-stroke order, so translucent overlaps blend once.
- The pinch amount lives in an external store that only the map subscribes to.
  The game screen and HUD re-render only when the atlas opens or closes. The
  map canvas stays mounted while closed, because creating it at the open
  threshold stalled a pinch.
- Raid pathfinding reuses a cached navigation grid, and routes are verified
  identical to the uncached search (`scripts/check-navigation-cache.mjs`).
- Texture warming decodes on a CPU raster surface instead of uploading through
  the JavaScript thread's GPU context. The camp texture stream budget doubles
  to 48 MB, enough to keep the ring of chunks around the player loaded.
- The Skia adapter reuses native paints for repeated solid fills, strokes and
  sprites, and caches text widths. Its output is byte-identical to the previous
  adapter across immediate and recorded drawing.

## New evidence

### Follow-up native rendering work

- Map tile requests now reuse their priority queue while the visible, coarse
  and prefetch tile ranges are unchanged. Subpixel camera movement no longer
  rebuilds and sorts that queue on every pinch update. Crossing a tile boundary,
  changing density level or changing the cache limit still refreshes it.
- An unfinished tile outside the new request set releases its raster surface
  immediately. Its already parsed paths remain reusable; completed fallback
  tiles remain cached. A failed surface allocation yields for that callback and
  remains retryable instead of leaving a permanently missing tile in the cache.
- Solid Skia paints now cache colour/style independently of animated opacity.
  Each draw sets effective alpha from the original colour alpha, avoiding native
  paint allocation and cache churn during fades without changing compositing.
- `native-map-tile-work` measures a synchronous tile-pump slice when it takes at
  least 1 ms. The older `native-map-tile` span remains elapsed time across frames;
  it must not be counted as one continuous CPU stall.

`scripts/check-native-rendering-efficiency.mjs` checks queue reuse, cancellation,
retry/disposal, and real Skia pixel equality for immediate and recorded drawing.
It exercises 2,400 draws with varying opacity across five paint styles (including
translucent colours, strokes, dashes and erasing). These host checks establish
allocation reduction and rendering equivalence, not an iPhone FPS improvement.

`metadata.nativeDiagnosticsRevision` identifies `map-transition-2026-11-01`.
`contextSamples[].presentation` records atlas zoom, opacity, map visibility,
texture readiness, pinch state and whether gameplay was drawn.

Important trace retention keeps map open/close/button, pinch start/end, texture
readiness, feature construction and geometry construction events. A
`native-frame-gap` trace reports the actual atlas zoom, current presentation
state, and preceding callback's zoom and measured update/render work.
`native-update` splits slow updates into simulation and terrain work;
`native-picture-publish` measures slow picture handoffs. `native-react-commit`
records React render CPU for the HUD/map when it exceeds 4 ms in development
or profiling builds. Despite its event name, this does not measure native UI
commit duration. Ordinary release builds may not supply Profiler callbacks.

`outsideMeasuredWorkMs` is the callback interval minus the preceding measured
update/render work. It includes ordinary frame pacing, scheduling and work
outside those measurements. It cannot identify garbage collection, a GPU stall,
thermal throttling or a memory leak. No total process/GPU memory measurement is
claimed. Asset loading spans are elapsed time, not synchronous CPU attribution.

## Native smoothness follow-up

The `ios-native-smoothness-v2` recorder revision accompanies these changes:

- Native autosaves persist a compact mutable-state manifest and two bounded
  layout slots. Layout dependencies are durable before the manifest commits.
  Existing single-file saves remain readable, and failed or corrupt saves do
  not silently reset progress. The shipped new-run fixture's ordinary payload
  is about 44 KB versus 782 KB previously; that is a storage/serialization-size
  result, not a measured iPhone speedup.
- One adaptive preparation scheduler shares available frame time between map
  tile construction and image warming. It skips already-late frames and learns
  native operation costs. A single Skia raster/decode call cannot be interrupted:
  overdue oversized work has an explicit rate-limited exception to avoid
  permanently missing artwork, and overruns remain logged.
- Native gesture handlers update map transforms, opacity, labels and markers on
  the UI runtime. Tile requests follow coverage changes; illustration pictures
  stay retained across map closures. Single-coverage cached tiles retain the
  existing coarse fallback during fast camera motion.
- Hidden HUD/waypoint sampling stops while the map covers play. Movement dots
  reuse native views and the day/night dial interpolates authoritative samples
  on the UI runtime, retaining their artwork and geometry.
- Waterfall image samplers and a reusable paint are cached with bounded lifetime
  and image-release invalidation. Immediate and recorded pixel comparisons
  match the uncached path.

`native-preparation-work` describes synchronous optional work, estimated frame
headroom and explicit oversized/overrun admission. `native-save-encode` reports
mutable-state characters, layout characters and the number of newly serialized
layouts. Optional native process-memory/thermal/power samples and Instruments
correlation are described in [iOS performance context](IOS-PERFORMANCE-CONTEXT.md).
Those extra samples require a rebuilt native app; Expo Go reports the capability
as unavailable. They still do not measure GPU execution or display FPS.

Focused regressions cover save recovery and migration, scheduler fairness and
liveness, tile/pixel equivalence, gesture models, HUD interpolation, native launch
and diagnostics. The iOS JavaScript export does not compile the local Swift
module. A native Xcode/EAS build and the physical-device comparison below remain
necessary before claiming a frame-time improvement.

## Repeat on the iPhone

1. Pull the latest main, then in `native` run `npm ci` and `npx expo start --clear`.
2. Pause → Performance recording → Start recording & resume.
3. Wait a few seconds, then pinch out into the map, pan and zoom, stand still
   with it open for ten seconds, and zoom back into play. Repeat three times.
4. Open and close once using the map button, so the trace can compare entry paths.
5. Pause → Performance recording → Stop recording → Export log (.json).

A 45–60 second capture focused on this interaction is more useful than a long
walk. Repeat at night if that is when lag is worst. Compare a release build on
the same phone afterward; Expo development overhead is not representative of
shipping performance. Persistent unexplained gaps need a device-native profiler
for UI/GPU, allocations or GC rather than stronger claims from this recorder.

## Verification

Native and root TypeScript checks; the native launch integration harness checks
that the opaque map stops world draws, survival continues, drawing resumes on
close, and the recorder can start from pause. The native map diagnostics check
covers thresholds, previous-callback attribution, gesture retention and session
isolation. Existing recording, v2 and hitch-retention checks cover bounded
buffers and export behavior. `scripts/check-native-map-tiles.mjs` proves every
subpath reaching a tile is drawn, compares tiled views with the previous
renderer, and checks for seams and double blending. The launch harness also
checks that tiles render only during play frames, from the pinch store. These
are host checks, not physical-iPhone FPS or visual smoothness measurements.

## Sprint terrain preparation

Native detail streaming uses 3.2 seconds of velocity lookahead (previously 1.6),
a 1,000-world-unit surrounding margin (previously 650), and at most 1,500 units
of directional lead. Teleports, pauses and substantial camera-size changes do
not extrapolate velocity. Nearby decoded detail receives a four-second residency
grace; visible terrain can still reclaim speculative space immediately. The
retention radius is 2,800 units so the extended lookahead is not immediately
discarded. Roads/camp/rivers have baseline budgets of 64/64/28 MiB respectively,
versus 48/48/20 previously. These describe stream-owned decoded bytes, not total
process memory or guaranteed GPU residency. Visible coverage can raise a budget
floor at unusual viewport/zoom sizes. Resolution thresholds and artwork remain
unchanged; browser streaming retains its previous settings.

Startup now exercises the actual drawing/LOD selectors while the loading screen
is visible, disposes that temporary picture, and waits for all admitted nearby
detail work before publishing the gameplay frame. It does not preload the whole
world. Failed visible detail produces a retryable startup error; failed
speculative work retains backoff rather than blocking startup forever. Warming
continues to use the standalone startup pump until gameplay begins, then shares
the frame scheduler. This prepares decoded images, not verified UI-thread GPU
uploads, so it cannot eliminate every first-use graphics stall.

`stream-visible-miss` identifies a detail image that reached the view before it
was ready. `stream-ready` includes `visibleOnReady` and `visibleWaitMs`; stream
snapshots include policy margins and current directional lead. Compare these
with `native-texture-warm` and hitch captures on a sprint recording. Coincidence
is evidence to investigate, not proof that loading caused a displayed-frame gap.

Run `node scripts/check-native-terrain-prefetch.mjs`,
`node scripts/check-native-preparation.mjs` and
`node scripts/check-native-game-launch.mjs`. These cover delayed preparation,
startup gating/failure, native-only policy selection, manifest coverage, byte
budgets and stale completions. They do not measure iPhone FPS.
