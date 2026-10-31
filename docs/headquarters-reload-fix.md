# Headquarters repair and Safari reloads

The reported iPhone reload was not reproduced in desktop Chrome. The repair
handler does not navigate, and the Level 0 → Level 1 menu transition succeeds.
However, the Level 1 grid decoded about 72 MiB of original artwork in the DOM
in addition to the active Skia world. The newly added ruined buildings also
remain loaded by the world renderer, increasing the memory pressure.

The web headquarters panel now uses 512-pixel, aspect-preserving thumbnails of
the same authored images. The measured 844 × 390 Level 1 menu uses 9.92 MiB
instead of 72 MiB (about 86% less decoded image data). Across all known menu
artwork, the budget falls from 195.5 MiB to 29.7 MiB. These numbers describe
decoded image pixels, not total browser or GPU memory. World sprites and
native artwork are unchanged. Unknown replacement artwork keeps its own URL.

Station actions now checkpoint the Survival run synchronously before the HUD
refresh. HQ and subsequent building repairs no longer depend on the 15-second
autosave or a page-unload event, which a browser process restart may not send.
Existing save-format validation, save-blocking and sandbox isolation remain.

Validation: TypeScript, production build, camp restoration checks, headquarters
checks and thumbnail coverage/transparency/aspect/memory-budget checks passed.
In the 844 × 390 gameplay fixture with the real Skia renderer, HQ repair spent
4 of 15 logs and immediately saved Level 1 with 11; workshop repair then saved
8. Reloading and loading that checkpoint retained the repaired camp and opened
the Level 1 menu. No iPhone/Safari runtime was available to confirm the original
restart is eliminated on the user's device.

Regenerate known menu artwork with `node scripts/build-headquarters-thumbnails.mjs`;
validate with `node scripts/check-headquarters-thumbnails.mjs`.
