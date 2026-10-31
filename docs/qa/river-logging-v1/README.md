# River continuation towards logging

Three more connected sections extend the approved northwest river: the former southern pool now has an outlet cascade, a southeast curve carries the river past the logging ground, and a final pool turns south towards the first planned crossing. Six sections are now installed. The bridge and the rest of the downstream river remain planned.

The new painting uses the existing terrain, roads and approved river as image references. `artwork-archive/river-logging-v1/master.png` preserves the generated 1254 × 1254 source. Three native-resolution crops map onto a 2816 × 2816 world footprint with exactly aligned 128-unit overlaps. A broad transition joins the existing pool; a corridor mask retains the surrounding terrain and logging arrival road. The camp and approved upper headwaters render identically to the preceding version. No trees or bushes are baked into the new artwork.

The extension reuses the approved twelve-frame foam atlas and the same world-coordinate animation clock, intensity and water displacement. The additional runtime artwork totals 802,476 bytes, including small previews. Full images remain camera-streamed, with at most three resident images and two concurrent loads across the entire river. No river image is required for editor entry.

Collision follows blue-water spans. Mask ownership transfers at the fully blended pool outlet, avoiding hidden collision from the former closed pool. Built water blocks movement; the logging arrival road, reserved crossing and unbuilt downstream guide remain walkable. Saved layouts and road geometry are unchanged.

Validation: `npm run typecheck`, `node scripts/check-river.mjs`, the world-guide geometry validator and `git diff --check` pass. Actual CanvasKit output was inspected in `installed-six-sections.webp` and `pool-connection.webp`. Between sampled animation times, 167,382 water pixels changed and no land/rock pixels changed beyond rounding tolerance. Checks also confirm unchanged camp, upstream artwork and logging road, correctly aligned crop overlaps, collision integration and streaming limits. See `checks.json` and `assets.json`.

Browser and physical iPhone verification were unavailable. These checks use the real CanvasKit software renderer; device frame rate and pointer interaction have not been measured.

The editor's Camera → River shortcut focuses the newest stretch. The world-map guide shows the six-section footprint and updated artwork preview. Generation references and the prompt are archived in `artwork-archive/river-logging-v1/prompts.json`; `scripts/package-river-logging.mjs` reproduces runtime crops and collision spans from the preserved master.
