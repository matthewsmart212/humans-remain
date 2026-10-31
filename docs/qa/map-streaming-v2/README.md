# Terrain streaming and render work, v2

Follow-up to v150 and `ScreenRecording_10-16-2026 16-54-58_1.mp4`.

The count-limited queues could permanently omit visible river sections. Full detail also joined the same background queue as all distant previews. Large camp textures decoded/uploaded roughly 23 MB each, even far from camp.

This revision uses 616 spatial chunks (516 road, 100 camp), each with full and half resolution levels. Full-resolution chunks retain the original pixel dimensions; a four-pixel sampling gutter and separate paint bounds keep internal seams invisible. A chunk uploads at most 1.032 MiB, versus 22.009 MiB for an old camp quadrant. Full-resolution chunks use quality-90 WebP, and half-resolution travel textures use quality-85 WebP. This fits the hosting limit while retaining native detail and reducing transfer size. The unmodified whole road sources stay in the repository; the published package replaces them with chunks. Legacy whole-road URLs redirect to correctly aligned previews so already-open older tabs remain usable until reload. Native-resolution river images remain whole because they are smaller and shared with waterfall sampling.

Detail is selected from projected pixel density, including device pixel ratio. All required visible detail is scheduled; foreground downloads and GPU preparations overtake background work. The 48/24/20 MiB road/camp/river targets account for decoded texels, including in-flight work. Visible coverage may expand a target to fit the current viewport; optional prefetch never does. Nearby completed textures remain reusable within that target. Decoded browser bitmaps and cached shader references are released with their images. These figures exclude shared props, render targets, driver caches and the browser's bitmap copy.

The renderer now draws directly to the surface, with one terrain upload per frame, instead of constructing/replaying/discarding a full scene picture each frame. A bounded 256-entry cache retains static terrain pipelines and releases dependencies when images are evicted. Ordinary placed objects, roofs and ground decals use conservative viewport culling; HUD state updates skip unchanged displayed values.

## Validation

- `node scripts/check-terrain-streaming.mjs`: reversal reuse, asynchronous decode/fallback/abort ownership, staged publication, shared image aliases and disposal.
- `node scripts/check-terrain-streaming-v2.mjs`: 1,098 viewport/zoom cases, including up to 125 visible road chunks and 19 visible river sections; no required section left on preview after the queue drains. Foreground priority/promotion; 720 transformed-object culling checks; production CanvasKit comparisons across camp and road chunk seams.
- Full-detail renderer comparisons measure 42.8–43.0 dB PSNR and about 1.16/255 mean channel error against the originals. Error at chunk edges is comparable to the rest of the image; no visible seams. The adjacent PNGs are actual renderer output.
- `node scripts/check-road-stream.mjs`: byte budget, retries, zoom-out, stale completion and disposal checks. Updated the obsolete ten-image assertion for the new scheduler.
- `node scripts/check-river-complete.mjs --data-only`: 111 water collision samples and four bridge checks, plus complete section streaming. Updated the obsolete three-image expectation.
- TypeScript and the production build pass.

`software-profile.json` compares the same terrain view against the retained v150 module. Paint allocations fall from 9 to 1 per frame. Median software draw time falls slightly, but the noisy p95 increases; this is **not** evidence of improved device frame rates. Native fragment-shader cost and iPhone GPU/thermal performance remain unmeasured. Browser QA is unavailable in this managed container, so no physical-device FPS claim is made.

Historical `check-river.mjs` expects an obsolete six-section river (the map has 26) and fails at that pre-existing assertion. It is superseded by the current river-complete checks; river geography was not changed.
