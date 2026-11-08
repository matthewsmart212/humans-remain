# Play-mode performance diagnostics

Pause → **Show FPS & frame time** toggles the optional overlay. Pause → **Performance recording** opens the diagnostics screen. **Start recording & resume** allocates the buffer while paused, then returns to the game. Reproduce the issue, pause again, open Performance, **Stop recording**, then **Export log (.json)**. The web version uses a file download or supported system share sheet; native Expo/iOS uses the system share sheet (Save to Files).

Both versions share the same collector and JSON schema. No editor controls are exposed in Play. The FPS overlay fits below the expanded character panel and does not intercept movement or action touches. The diagnostics screen scrolls within the landscape safe area.

## What a log contains

- Every measured active frame: offset from Start, **unclamped** callback interval, synchronous CPU update and render/picture-recording time, fixed simulation steps and time above the simulation's 100 ms catch-up cap.
- Summary: average callback FPS, mean/p95/p99/worst frame time, average CPU timings, >33.33/>50/>100 ms frame counts, active gameplay and wall-clock durations, and stop reason.
- At most once per second: scene, in-game position, sprint state, object/animal/enemy/loot/effect counts, zoom, viewport and the existing road/camp/river texture-streaming estimates.
- Device/render metadata and lifecycle events for pause, backpack, background and stop. Restart/leave Play ends a recording and retains its log for this app session.

First callbacks after Start/resume/background transitions establish a new baseline; menu/background intervals are not misreported as frame spikes. Real long **active** frames are not discarded or clamped in the log.

## Performance and privacy boundaries

Diagnostics default to off. No recording buffer or diagnostics polling timer is allocated while off. The collector adds no per-frame React updates, console logging, disk writes, screenshots or network requests. Native CPU clock reads are conditional; web reuses its existing render timing. The optional display refreshes at most twice per second. Context collection is limited to once per second and reads existing counts and stream statistics, without traversing all placed objects.

One preallocated Float32 buffer holds up to 120,000 frames (2,880,000 bytes). A recording stops at the frame cap or 15-minute wall-clock limit, whichever arrives first. Context samples and lifecycle events are also bounded. Sorting percentiles and building/exporting JSON happen only after Stop, never inside the frame callback. A new recording replaces the previous one; export before closing/reloading the game. Logs stay local unless the player explicitly exports/shares them. They contain in-game location and device settings, not credentials or artwork.

This is low-overhead instrumentation, **not zero overhead**. FPS means game `requestAnimationFrame` callback cadence, not a measurement of completed GPU/display frames. Native render timing measures JS-thread Skia picture recording; web measures synchronous drawing/submission, not GPU completion. Texture-byte estimates are for the named terrain streams, not total GPU/process memory. Threshold counts are slow-frame counts, not inferred dropped frames. A device GPU profiler is needed to diagnose GPU-only stalls. Export in a release build for representative measurements; Expo development overhead is reported in native metadata.

## Verification

- `node scripts/check-performance-recording.mjs`: deterministic 30/60/120 Hz, real hitch, pause/background/backpack filtering, zero-frame reports, caps, finite JSON, no frame notifications, disabled polling, actual platform menu handlers, and web/native export adapters.
- `npm run typecheck` in root and `native`.
- Existing `check-field-kit.mjs` and `check-survival-needs.mjs` regression suites.
- Expo iOS production JS (`--no-dev --minify`) uses the same share-sheet export; the file and sharing modules stay in the main bundle.

The collector microbenchmark in `docs/qa/performance-v1/checks.json` measures only collector code on the build host, not total UI/clock/context overhead or physical-device FPS. Browser interaction and a physical iPhone/OS share sheet are not exercised in this environment.
