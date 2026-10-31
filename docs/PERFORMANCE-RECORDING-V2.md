# Performance recording v2

The pause-menu recorder exports `safety-last-performance/v2`. Use the same Start,
Stop and Export controls on web and native. Recording is local and opt-in; there
are no automatic uploads, screenshots, account details, or artwork URLs in the
trace. Keep the current visual quality and capture a 2–3 minute walk through
camp, along roads and across river boundaries, including combat/night/weather
when practical.

## Reading a recording

- `frames` retains the v1 six-column layout. `renderPhases` has a matching row
  for each frame, with names in `renderPhaseColumns`.
- Main CPU stages: surface setup, texture warm draw, texture warm flush, world
  drawing, final render flush and cleanup. Shader preparation and shelter-alpha
  silhouette construction are nested in world drawing, not extra time to add.
- `slowFrames` contains the worst 128 cadence/CPU spikes, with both the current
  and preceding callback. A long interval at callback N can be caused by work
  at N−1. Links never cross pause/resume; excluded first callbacks retain their
  CPU evidence in `resume-frame` events.
- `traceEvents` identifies chunk requests, download/decode paths and durations,
  texture dimensions/queue waits, ready/failure/retry/eviction events, surface
  replacement and supported browser long-task signals. Asset durations are
  overlapping wall-clock spans, not CPU attribution. Async completions from an
  earlier recording are excluded.
- Context once a second includes each stream's resident/pending/budget bytes,
  counts and up to 12 missing chunk keys with pending age/retry state. It also
  includes the artwork load/warm queues, buffer dimensions and weather/night.
- CanvasKit cache counters are read through public APIs, with a guarded fallback
  for the installed wrappers that omit their return values. `null` means no
  reading, not zero. These are cache bytes, not total GPU/process memory.
- Native reports picture-recording CPU stages and separate preparation events;
  it does not claim to time render-thread/GPU completion. Unsupported browser
  long-task APIs are explicitly marked unavailable (including on Safari).

### Hitch retention revision (2026-10-23)

`recorderRevision: hitch-retention-2026-10-23` keeps the v2 frame layout and adds:

- `hitchCaptures`: up to 32 windows around the worst cadence/CPU spikes, each
  with up to 256 trace events. A window normally starts one second before the
  preceding callback and ends two seconds after the triggering callback. Nearby
  spikes share a window; extreme gaps are limited to five seconds of evidence.
  `slowFrames[].captureIds` links each slow frame to overlapping captures.
- `importantTraceEvents`: a separate 128-event ring for stream failures,
  context loss/restoration, surface creation, excluded resume callbacks and browser capabilities.
  `browserCapabilities` also retains the capability result independently.
- Every trace event has a session-local `id`. The same event can appear in the
  recent ring, a hitch capture and the important ring; deduplicate by ID.
  `traceEventsDropped` now counts events absent from **all** retained histories.
  `recentTraceEventsOverwritten`, `importantTraceEventsOverwritten`,
  `hitchCapturesOmitted` and each capture's `traceEventsOmitted` expose limits.
- Async events that complete later can still attach to an older overlapping
  window. An overlapping download/decode span does not establish CPU causation.
- `frame-callback-delay` records web callback delivery lag of at least 8 ms
  relative to its animation-frame timestamp. This helps distinguish late
  delivery from work inside the measured game update/render, without attributing
  the delay to a particular browser task or GPU operation.
- `context-sample` measures the once-per-second diagnostic sampling itself on
  web/native, including cache counter reads that happen after frame CPU timing.
- Stream eviction events include resident `ageMs` and `reason`. Stream context
  adds `rapidEvictions` (under 1.5 seconds resident) and `recentReloads` (within
  two seconds of a recorded eviction). These counters are since renderer boot.

Captures are opt-in and bounded, and hold references to existing event objects.
No extra per-frame timing buffers or React updates are introduced. Sorting and
deduplication remain deferred until export. A capture's requested end can extend
past Stop; evidence naturally ends when recording stops.

## Cost and limits

No per-frame UI notifications, sorting, serialization, pixel reads or GPU fences
are added. Stage clocks run only during recording; browser observers/listeners
are attached only while recording and removed on stop/disposal. Numeric timing
buffers occupy 6,840,000 bytes at the existing 120,000-frame cap. Context and
lifecycle history remain capped; the recent trace ring retains 2,048 events,
plus the separately capped hitch/important histories above. Percentiles and JSON
generation run after Stop. The 15-minute wall-clock limit still applies.

## Targeted performance changes

Visible terrain can now evict an offscreen ready prefetch when a stale in-flight
request occupies the remaining byte budget. Previously, a still-wanted prefetch
could strand visible detail until that old request finished or timed out. Visible
ready tiles remain protected and speculative work cannot exceed the budget.
This is a proven scheduler edge case, not a proven cause of the user's earlier
river delay. Upload warming still publishes at most one new image per frame,
reuses one preparation paint and no longer builds a temporary key array each
frame. Failed preparation clears stale priority markers. Artwork resolution,
shader appearance, simulation and controls are unchanged.

The hitch-retention revision also reserves pending and newly prepared tiles
before scheduling speculative replacements. Ready offscreen tiles receive a
1.5-second residency grace and evicted tiles a two-second speculative reload
cooldown; visible tiles bypass both. Visible coverage and the existing byte
budgets still take priority. Eviction only happens if enough reclaimable bytes
exist for the incoming request. Completion transfers bytes from pending to
resident atomically, avoiding transient double-counting between promise jobs.

The supplied iPhone route fragment is retained as position-only test data in
`scripts/fixtures/terrain-churn-route.json`. A scheduler replay with interpolated
positions, fixed 100 ms loading and three shared download slots changed from
166 to 149 requests, and from 13 to zero repeat requests within two seconds.
Missing-detail exposure changed from 250 to 200 chunk-milliseconds with the same
47.88 MiB peak layer allocation. These are deterministic scheduler results,
not physical-device frame-rate measurements or a replay of real network timing.

## Verification

- `node scripts/check-performance-hitch-retention.mjs`: early evidence survives
  4,000 later events, late async completion, fault/capability retention, explicit
  truncation, session isolation and sustained slow-frame collection limits.
- `node scripts/check-stream-churn.mjs --compare-ref 0ecd8c127c4365d3d318505023c497872bd75efb`:
  residency/reload grace, visible priority, expiry, atomic accounting, all-or-none
  reclamation and the recorded-route scheduler comparison.
- `node scripts/check-performance-v2.mjs`: stage/hitch alignment, pause/resume,
  session isolation, capped histories, observer lifecycle/unsupported APIs and
  the stale-prefetch priority/retry regression.
- `node scripts/check-performance-recording.mjs`: cadence, limits, UI controls,
  web/native export adapters and collector overhead (host-only, not phone FPS).
- `node scripts/check-web-world-surface.mjs`: actual broken-wrapper shape,
  unavailable counters, 100 orientation changes and context/resource cleanup.
- `node scripts/check-terrain-streaming.mjs`: production renderer traces,
  decode fallback/abort, one-image-per-frame warming and pixel preservation.
- `node scripts/check-terrain-streaming-v2.mjs --coverage-only`: 1,098 viewport/
  density cases, foreground priority and 360 transformed culling cases. The
  historical full comparison needs retired original paintings absent from this
  checkout; the new coverage-only option reports that limitation explicitly.
- `node scripts/check-road-stream.mjs`: budgets, stale completion and backoff.
- `node scripts/check-native-authored-world.mjs`: native renderer/Picture
  playback via CanvasKit software shim, fauna/combat and both orientations.
- Web/native TypeScript checks. Development-only browser fixture at
  `scripts/performance-qa.html` uses the production renderer and pause panel.

Physical iPhone performance is not established by host or cloud-browser tests.
The 15:28 phone log averaged 59.722 FPS over 156.576 active seconds, with a worst
117 ms interval following 100 ms CPU rendering (86 ms in render flush). Most
early asset events had already rolled out of the old trace ring. A new phone
recording is needed to measure the deployed streaming change and use the
preserved evidence to investigate those early render/dispatch stalls.
