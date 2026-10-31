# Faster editor entry

The editor previously awaited all full-resolution terrain, movement sheets and
placed animation frames before showing the workspace. The existing camp preview
was therefore unable to shorten entry.

Build now opens after its first rendered frame with the original camp preview,
idle player, and all placed objects, roofs, ground decals and gate states loaded.
The four camp detail tiles, three world ground materials, walking/combat sheets
and remaining object animation frames load afterward. Placed objects hold their
approved first pose until the complete animation is available. Custom uploaded
terrain remains mandatory at entry.

Walk and Play wait for their required artwork and GPU warm-up, promoting queued
work ahead of optional terrain. Build and the Cancel action cancel a pending mode
switch without discarding the draft. Failures remain local to background detail
or movement preparation and can be retried. The same bounded loader deduplicates
shared URLs. Atlas and font requests now overlap graphics initialization, and
renderer code loads while the saved draft is resolved.

No artwork, world bounds, collision definitions, placement data, storage logic or
regional terrain colours were changed.

## Verification

- TypeScript check and production build.
- Existing loader tests: request/body deadlines, cancellation, retry, resource
  disposal, concurrency and shared image decoding.
- `scripts/check-editor-startup.mjs`: foreground queue promotion, first useful
  camp render with all optional downloads stalled, retained objects during
  missing animation frames, failed detail/movement downloads and recovery, GPU
  preparation, and identical final pixels to the full upfront loading path.
- All 1,368 saved-camp fixture placements remain unchanged.

The saved-camp fixture falls from 82 blocking image URLs / 63,634,496 bytes to 53
URLs / 24,813,616 bytes: **61% less artwork before entry**. These are payload
measurements, not a claim of 61% faster wall-clock loading. JavaScript, CanvasKit
WASM, fonts and metadata are excluded from these image totals. The local renderer
uses a production CanvasKit software surface; no physical iPhone or browser
timing measurement was available. The deferred work still downloads afterward.

`camp-entry.webp` shows the usable preview and `camp-full-detail.webp` shows the
original detail after loading. `checks.json` records the measured results.

Reproduce the focused check with the directory containing read-only copies of
the saved camp's immutable `/api/asset-files/<id>` resources, named `<id>.image`:

```sh
node scripts/check-editor-startup.mjs /absolute/path/to/artwork-inputs
```
