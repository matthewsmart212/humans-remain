# Retired runtime artwork

These unmodified assets previously lived under `public/survival`. They are retained here so
static asset packaging cannot restore their unused copies and exceed the
256 MiB hosting archive limit.

- `hearth-painted-v1`: superseded hearth textures.
- `hearth-painted-v2`: superseded hearth textures; active hearths use bonfire art.
- `camp-ground-v2`: superseded camp ground; active camp uses v3.
- `home-terrain-centre-v4.webp`: obsolete centre preview, referenced only by the historical runner render script (which now uses this archive path). Moving it out of runtime packaging makes room for the revised northern terrain while retaining the immediately previous northern textures for already-open clients.
- `home-terrain-hd-v2.webp`: obsolete 6 October rectangular terrain, superseded by the current square camp ground. No active renderer, saved-layout fixture or native entrypoint uses this file. Archiving its 20,921,646 bytes makes room for the village outskirts while retaining all earlier extension URLs.

Source images remain available for restoration and historical preparation
scripts. No active game image URLs or saved camp placements were changed.
