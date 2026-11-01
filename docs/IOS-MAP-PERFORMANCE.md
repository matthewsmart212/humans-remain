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

## Repeat on the iPhone

1. Pull the latest main, then in `native` run `npx expo start --clear`.
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
