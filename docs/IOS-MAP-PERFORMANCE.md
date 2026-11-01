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
buffers and export behavior. These are host checks, not physical-iPhone FPS or
visual smoothness measurements.
