# Camp gate state artwork

Created with built-in image generation using the original camp gate and wall artwork as references. Final generation prompts are in `prompts.json`; hinge-registration measurements are in `registration.json`.

Six source sheets (one open/closed pair per entrance) are retained here as `south.png`, `southwest.png`, `west.png`, `northwest.png`, `northeast.png`, and `southeast.png`.

The 12 transparent runtime images are saved in `/workspace/sites/safety-last/public/survival/camp-gate-states-v1/`, named `<entrance>-closed.webp` and `<entrance>-open.webp`. The packaging script extracts frames and registers the hinge positions at build time. Runtime interaction swaps complete images; it does not bend, slice or animate their geometry.

Original wall placement records, gate placement records and other camp items are preserved. West gate hinge artwork/collision is adjusted 15 world units into the existing wall-foot overlap to retain timber thickness.

Verification: 96 close-range openings, 96 queued-close scenarios and 48 rotated/mirrored registration cases passed. The shared Skia camp renderer reviewed all six gates in both states. No browser or physical iPhone tap test was available.
