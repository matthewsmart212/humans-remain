# Northwest river headwaters

Three connected river sections are installed northwest of camp: rocky headwater, cascade pools, and a southern bend. The downstream river and bridges remain planned. The editor Camera tools include a River shortcut, and the world guide includes a River headwaters focus and a built-art preview.

One reference-guided image edit produced `artwork-archive/river-headwaters-v1/master.png`. All three runtime images are native-resolution crops from that continuous 1070 × 1470 painting; no artificial upscaling is baked into them. They map to the 2048 × 2816 world footprint with identical pixel alignment in the approximately 128-unit overlaps. Outside edges blend into the existing terrain. Trees and bushes are separate future assets.

Twelve transparent generated foam frames are packed into one atlas. A shared world-coordinate clock crossfades them and gently distorts blue water only; rocks and earth remain still. Full artwork is camera-streamed with at most three resident images and two concurrent requests. Only small previews and the motion atlas join optional terrain detail; no river image is required to enter the editor. Total river runtime artwork is 1,316,824 bytes.

Blue-water spans provide collision only for this built stretch. Custom ground, interiors, the camp and the future river guide are unaffected. Saved placements and road geometry are unchanged.

Validation: `npm run typecheck`, `node scripts/check-road-stream.mjs`, `node scripts/check-river.mjs`, and the world-guide geometry validator pass. Actual CanvasKit renders were inspected at overview and gameplay scales. Across sampled animation times, 260,146 water pixels changed and zero ground/rock pixels changed beyond rounding tolerance. The original camp renders identically with and without the river. See `checks.json`, `assets.json`, `installed-three-sections.webp`, and the three `water-motion-*.webp` frames.

Browser and physical iPhone verification were unavailable in this environment. CanvasKit software rendering was used; device frame rate and live pointer interaction have not been measured.

Generation prompts and reference paths are preserved in `artwork-archive/river-headwaters-v1/prompts.json`. Originals are kept alongside it; `scripts/package-river.mjs` regenerates the cropped runtime images, motion atlas and collision spans without altering those originals.
