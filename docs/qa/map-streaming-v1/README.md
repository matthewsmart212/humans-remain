# Map-boundary streaming investigation

Source baseline: `edb3b9636ace1a34d4af3c51a5021ce3d31b29dc` (published version 149).

The supplied 7.2-second recording contains held camera frames followed by larger
position changes, including around 0.87, 1.73, 2.10 and 3.43 seconds. The recording
alone cannot identify the responsible CPU/GPU operation. Physical iPhone profiling
and browser GPU validation were unavailable in this session.

The base terrain already shares one decoded ground image. Road and river detail,
however, bypassed texture warm-up, used encoded images whose decoding could be
deferred to the first draw, and released artwork at the same boundary used to
request it. Those are the targeted sources of avoidable work.

Changes:

- Prefetch within 800 world units and look ahead along camera movement.
- Retain nearby recent detail within 1,600 units until another image needs its
  slot. Resident plus pending detail remains bounded at 10 road / 3 river images.
- Use asynchronous browser bitmap decoding for streamed road/river artwork on
  WebGL, preserving the encoded-image path for software and unsupported codecs.
- Prepare at most one new texture per frame and expose it only after preparation.
  Flush the warm-up draw before it is covered, so it cannot be discarded as hidden.
- Preserve full image resolution, terrain coordinates and all animation shaders.

Validation:

- `check-terrain-streaming.mjs`: prefetch, repeated boundary reversals without new
  loads, memory limits, zoom hysteresis, disposal, bitmap ownership/cancellation,
  codec fallback, staged rendering and unchanged pixels through real CanvasKit.
- `check-road-stream.mjs`: existing streaming lifecycle checks pass.
- `check-river-complete.mjs --data-only`: 111 collision samples and four bridges pass.
- TypeScript checking and production build pass.

The older `check-world-ground.mjs` route test fails identically in the untouched
baseline and this change at player coordinates (-3550.98, -2893.70), where its
straight journey meets the river added after that test. It is not a new regression.
No collision or movement rules were changed.

Next device check: reload the editor and sprint the same route in both directions.
This patch has no measured on-device FPS claim; compare the remaining hitches on
the actual iPhone, including the first traversal and a repeat traversal.
