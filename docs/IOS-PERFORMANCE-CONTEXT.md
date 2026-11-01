# iOS performance context

The optional `GameDiagnostics` local Expo module adds a device-context sample every two seconds during an active, foreground performance recording. There is never more than one native request in flight. Pausing, stopping or backgrounding prevents further requests and discards late results; diagnostic failures do not interrupt the game.

The exported trace contains:

- `thermalState`: iOS's nominal, fair, serious or critical thermal state.
- `lowPowerMode`: whether iOS Low Power Mode is enabled.
- `residentBytes` and `physicalFootprintBytes`: the process's resident and physical-footprint memory from `task_info(TASK_VM_INFO)`. These are different measurements and must not be added together. They include more than JavaScript memory and are not a GPU-memory measurement. A failed read has `memoryAvailable: false` and omits both values.
- `nativeUptimeMs`, `nativeSampleMs`, `requestedAtJsMs`, `receivedAtJsMs` and `roundTripMs`: native sample time/cost and the JavaScript request/receipt bracket. The round trip includes queueing and callback delivery; it is not synchronous game CPU time.
- `session` and `sequence`: local recording/sample counters. They contain no account or device identifier.

## Native builds and Expo Go

Expo Go cannot contain this app-local Swift module. The game remains usable there and records `native-device-context-capability` with `available: false`; it does not invent memory or thermal measurements. The ordinary JS/UI recorder remains available.

Rebuild the iOS development or release app to include local module changes. From `native`, use the project's normal Expo prebuild/native build or EAS workflow; restarting Metro alone cannot add Swift code to an installed app. Expo autolinking discovers `modules/game-diagnostics` automatically. The module has no permissions prompt and no network reporting.

## Correlating an iPhone recording with Instruments

Use a release/profile build on the actual iPhone for performance comparisons. Keep the route, device, graphics, enemies and recording settings consistent across runs; include a repeated pinch into/out of the map, walking into a new terrain region, combat and a save/checkpoint.

In Xcode Instruments, record the game with the game/Metal performance and Points of Interest instruments. Filter points of interest to subsystem `com.safetylast.game-performance`, then locate `Device Context` events. Each event carries the same numeric session/sample pair as the JSON trace. Use the event as the native timeline reference and the exported JS request/receipt bracket as the correlation uncertainty. Native uptime and JavaScript `performance.now()` are different clocks; do not subtract them directly.

These markers are sampled context, not per-frame spans. Use Metal's CPU/GPU/presentation tracks to identify actual render or display stalls. Neither this module nor the existing UI callback probe measures GPU execution time or guarantees a displayed frame. Heat or Low Power Mode correlation alone does not establish causation.

The portable regression checks validate lifecycle, backpressure, stale-session handling, malformed/missing metrics and Expo autolinking. They do not compile Swift for iOS or replace a physical-device Instruments run.
