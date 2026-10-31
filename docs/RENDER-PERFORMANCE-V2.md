# Rendering performance investigation

Baseline: `2267db9eeed503800030cfff4ba972d9ab838d9f` (Site version 224).
Reported device symptom: 20–25 FPS; target: sustained 60 FPS.

## Findings and changes

The 4,465-placement world and 64 animals were profiled separately from rasterization. On the build host, simulation averaged 0.04–0.13 ms and JavaScript draw preparation 0.25–0.48 ms. Raster work dominated the software-renderer profile. These are host measurements, not iPhone timings.

- Ground colour previously evaluated multiple noise, trigonometric and region functions for each shaded pixel, each frame. A shared 4 MiB data texture now supplies the static colour weights. Original painted textures keep their resolution.
- The ground and surveyed roads were shaded beneath the opaque camp painting. The renderer now clips that hidden work, preserving the feathered perimeter and custom-terrain behavior.
- River fragments previously searched 11 main-route segments and up to five branch segments. Static direction and bank fields are now computed once, using 16-bit float data and linear interpolation. Water ripples still animate in the live shader; original paintings, bridges and collision masks are unchanged.
- The probe's unique camp images occupy approximately 128.4 MiB before the change and 110.5 MiB afterwards, excluding streamed detail and framebuffer storage. This exceeds the old 96 MiB GPU cache, making texture churn a plausible additional cause. The bounded web cache is now 192 MiB. Actual GPU usage and the new fields' 20.58 MiB allocation are included in opt-in performance logs. Driver eviction was not measured on a phone.

## Controlled rendering comparison

Same bundled world, 844×390 surface, three frames per location, final warmed frame. CanvasKit software backend; camp detail streaming disabled in this cost probe. PNG encoding excluded from timings. **These numbers cannot be converted into expected phone FPS.**

| Scene | Before, ms | After, ms | Reduction |
|---|---:|---:|---:|
| Camp | 2834.8 | 202.9 | 92.8% |
| Forest | 7530.3 | 2159.4 | 71.3% |
| River | 10201.1 | 3247.6 | 68.2% |

Reproduce with `node scripts/profile-rendering.mjs --revision=2267db9eeed503800030cfff4ba972d9ab838d9f --output=.qa/before.json` and `node scripts/profile-rendering.mjs --output=.qa/after.json`. Raw results and verification summaries are in `docs/qa/render-performance-v2/`.

## Validation

- Web and native TypeScript checks pass.
- `check-shader-fields.mjs`: five views, mean ground-colour error below 0.24/255, 99th-percentile error 1/255; native Picture sampling matches direct rendering; river fields stay below 18 MiB.
- `check-camp-occlusion.mjs`: seven camp/interior/edge views and Picture playback; only float-rounding differences, maximum one channel level.
- `check-river-surface-flow.mjs`: all 15 reaches, side features and joins pass. Dry banks remain stationary, water moves, loop seams pass, approved bridge error 0.0256 is below the unchanged 0.03 tolerance.
- `check-native-authored-world.mjs`: full production native renderer through the CanvasKit shim, both orientations and zoom limits, wildlife/combat/food/streaming checks pass.
- `check-web-world-surface.mjs`: 100 orientation changes retain one graphics context and at most one live framebuffer; cleanup, cache statistics and fallback pass.
- Contact foliage, stream budgets and performance-recorder checks pass.
- Browser QA loads all 4,465 placements and 64 animals, with visible camp detail fully resident; day and night/heavy-weather visuals inspected. That browser has no GPU backend: its 1688×780 sample was 2.22 FPS, 0.48 ms average update and 450.26 ms software rendering. This is an environment limitation, not a phone result.
- The historical `check-terrain-streaming-v2.mjs` raster comparison cannot complete because its retired full-road/full-camp fixture files are absent from this checkout. Its pre-raster stream and culling assertions pass; the current stream, river, camp and native-renderer checks above cover the changed paths.

Physical iPhone performance, GPU cache pressure and sustained thermal behavior remain unmeasured. After reopening the published game, use Pause → Performance → Start recording & resume, walk through camp/forest/river for 60 seconds, then Stop and Export. Check average FPS, frame-time percentiles, render/update time and the new graphics-cache samples before claiming sustained 60 FPS.
