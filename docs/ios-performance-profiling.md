# iOS performance capture and verification

The target is the native iPhone game. Web builds verify publication compatibility;
browser FPS is not evidence of iPhone performance. Keep artwork, resolution,
simulation frequency, enemy behaviour and visual effects unchanged when comparing.

## Record a useful run

1. Pull the current `main` and note `git rev-parse HEAD`, iPhone model, iOS version,
   Low Power Mode and whether the device is warm. Keep those conditions consistent.
2. Restart Expo from `native` after pulling or editing code. The log records the
   commit and tracked-change flag captured at Metro startup; Fast Refresh does
   not update that source snapshot. Pause the game, open Performance, and choose
   **Start recording & resume**. The recorder works in both development and release.
3. Repeat a short route: 20 seconds standing in camp, 30 seconds moving through
   dense scenery, five full pinch-out/pinch-in cycles, map panning, then combat.
   Include first-use and repeated map opens. Record each scenario separately if
   investigating one problem; a two-minute reproduction is easier to inspect.
4. Pause immediately after the hitch, open Performance and stop. Development mode
   attempts to save to `performance-logs/latest.json` on the Expo computer. If that
   fails, use **Export log (.json)**. Release mode uses the share sheet.
5. From the repository root run:

   ```sh
   node scripts/analyze-performance-log.mjs performance-logs/latest.json
   ```

   Keep the timestamped JSON alongside the commit and device notes. A new
   recording replaces the in-memory recording, so export before starting again.

For a quick production-JavaScript comparison:

```sh
cd native
npx expo start --no-dev --minify
```

Close and reopen the app after changing mode. This is still Expo Go or your
development client, not an App Store release binary. Use a physical iPhone release
build for final performance acceptance. Do not mix development and release
recordings in a before/after comparison. Auto-save-to-computer is still
dev-only. **Export log (.json)** uses the share sheet in both modes — Save to
Files on the phone.

## What the JSON measures

| Field | Meaning |
| --- | --- |
| `frames` / `frameColumns` | Every retained active JS callback interval, update CPU, picture-recording CPU and fixed-step count. |
| `frameContexts` / `frameContextColumns` | Same row index as `frames`: player/gameplay-camera coordinates, gameplay and atlas zoom, enemy count, pinch, map visibility/readiness, world drawing and movement. Flags have explicit known bits; unavailable values are null. Camera values describe gameplay framing, not GPU raster positions. |
| `systemTimings` / `systemTimingColumns` | Simulation, terrain streaming, map tile preparation, sampled diagnostics, and six simulation child phases. Unsupported/unmeasured columns are zero; zero does not prove zero real cost. |
| `renderPhases` | CPU work building/submitting Skia pictures and preparing textures/shaders. GPU execution is not measured. |
| `slowFrames` | Worst 128 retained slow frames with exact current and preceding callback details. No links cross pause/resume. |
| `timeline` | One-second callback buckets with p95/worst interval and indexes into the full frame table. Pauses leave gaps. |
| `hitchCaptures` | Nearby bounded trace evidence for the worst retained windows, with omission counts. Shared event IDs must be deduplicated. |
| `uiCadence` / `native-ui-cadence` | UI-runtime worklet callback intervals in delivered batches: mean/worst, threshold counts and JS delivery delay. Independent of JS game-loop cadence, but not displayed FPS or GPU completion. |
| `contextSamples` | One-second environment and cache snapshots, such as weather, scene and texture queues. |
| `native-save-encode` | Synchronous save serialization CPU. |
| `native-save-write` | Elapsed queue/storage completion time; it may overlap rendering and is not CPU attribution. |
| `native-memory-warning` | An iOS memory-warning event when delivered. Absence is not proof of low process/GPU memory. |

The callback interval ends at the current callback's **start**. Work from the
preceding callback may explain that interval. Current CPU work may instead delay
the next callback. The analysis preserves both and does not assign causation
merely because asset loading overlaps a hitch. Map preparation/diagnostics after
render are included as auxiliary CPU, without adding nested simulation spans twice.

The UI probe submits about two batches per second and permits only one pending
JS delivery. It continues counting UI callbacks while JS is busy. Timing alignment
uses approximate wall-clock conversion; inspect `clockAlignment` and
`deliveryDelayMs`. Pausing/stopping discards incomplete or undelivered batches;
the aggregate reports observed coverage, not a complete UI-frame trace.

## Keep profiling from becoming the bottleneck

Recording is opt-in. Typed frame buffers are allocated once before resuming and
capped at 17.4 MB for 120,000 frames; recording stops after 15 minutes. Trace
history is separately bounded. Overlay-only mode allocates no frame recording
buffers. No per-frame file/network writes or console logs are added. Percentiles,
analysis and JSON expansion happen after stopping; export temporarily uses more
memory than the typed buffers. Compare a run with recording off to assess observer
overhead. `diagnosticsMs` is sampled diagnostic work, not all profiler overhead.

## Interpret the result and choose the next tool

- High movement/combat/wildlife CPU: inspect the corresponding simulation phase.
- High picture-recording CPU: inspect draw/texture/shader spans and visible work.
- Low measured JS CPU with slow JS cadence: inspect auxiliary spans, React work,
  asset events and UI batches before naming a cause.
- Smooth UI callbacks but delayed JS delivery: evidence of JS-side backlog,
  not proof that the GPU presented smooth frames.
- Slow UI cadence or low JS CPU with visible stutter: capture the physical device
  in Xcode Instruments. Use Time Profiler for native/JS thread CPU, Animation
  Hitches for presentation problems and Metal tools for GPU/texture work as
  appropriate. Use Allocations/VM Tracker for process memory. Thermal state,
  total native memory, GC pauses and GPU completion are not measured here.

Target 16.67 ms for a 60 FPS budget. Judge p95/p99 and individual hitches as well
as averages, and separate cold loading from warmed gameplay. Keep an identical
route/save and repeat at least three runs before claiming a speedup. Validate
on the oldest supported iPhone as well as a newer device. This change has no
physical-device FPS acceptance result yet.

## Automated checks

`check-engine-hotpaths.mjs` compares old/new movement and gate geometry plus
profiled/unprofiled simulation state. `check-navigation-cache.mjs` validates route
equivalence. `check-native-rendering-efficiency.mjs` checks map queue reuse,
allocation failures/disposal and Skia pixel equivalence across opacity changes.
`check-native-map-tiles.mjs` checks tile coverage and seams. Recorder and UI-probe
checks exercise pause/session boundaries, bounded history, exact context,
delayed batches and attribution. Typechecks and Expo's iOS production export
validate compilation; they do not run an iOS app or its GPU.

## References

- [React Native performance](https://reactnative.dev/docs/performance)
- [React Native profiling](https://reactnative.dev/docs/profiling)
- [Expo development and production modes](https://docs.expo.dev/workflow/development-mode/)
- [Reanimated UI frame callbacks](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/)
- [Worklets scheduleOnRN](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/)
- [React Native AppState and iOS memory warnings](https://reactnative.dev/docs/appstate)
