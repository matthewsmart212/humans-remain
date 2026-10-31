# Camp foliage conversion

Created with the built-in ImageGen tool. The camp now has 18 foliage designs; eight are new in this update. Every planted instance remains selectable, movable, removable, nonblocking and responsive to walking, sprinting and enemy contact.

The approved update is applied once to the current selected camp draft. It preserves all pre-existing placements and their settings. It does not replace the live draft with the QA fixture. The fixture adds 1,726 plants, including outer scenery; final placement count adapts to the owner’s current objects.

The original terrain artwork remains archived at `/workspace/sites/safety-last/artwork-archive/painted-terrain-hd-original/`. These unused original textures are excluded from the published bundle to stay below the hosting archive limit. New ground-only tiles preserve the 4800 px canvas, 3600 px playable centre, 600 px border and path network. The exact old bonfire-background upload is reskinned to a clean registered clearing. Future terrain and clearing uploads keep priority.

## New runtime assets

| Design | Saved file | Dimensions |
| --- | --- | --- |
| Sage woodland fan | `/workspace/sites/safety-last/public/survival/foliage-v4/sage-fan.webp` | 384 × 232 |
| Deep forest ivy mat | `/workspace/sites/safety-last/public/survival/foliage-v4/forest-ivy.webp` | 384 × 220 |
| Copper woodland leaves | `/workspace/sites/safety-last/public/survival/foliage-v4/copper-leaf.webp` | 384 × 226 |
| Blue-green woodland fern | `/workspace/sites/safety-last/public/survival/foliage-v4/blue-fern.webp` | 384 × 232 |
| Woodland berry bramble | `/workspace/sites/safety-last/public/survival/foliage-v4/berry-bramble.webp` | 384 × 210 |
| Golden woodland flowers | `/workspace/sites/safety-last/public/survival/foliage-v4/yellow-woodland-flowers.webp` | 384 × 217 |
| White woodland clover | `/workspace/sites/safety-last/public/survival/foliage-v4/white-woodland-flowers.webp` | 384 × 213 |
| Ochre meadow grass | `/workspace/sites/safety-last/public/survival/foliage-v4/ochre-meadow-grass.webp` | 384 × 222 |

Ground files: `/workspace/sites/safety-last/public/survival/camp-ground-v2/` (`preview.webp`, `full-4800.webp`, `centre-3600.webp`, `nw.webp`, `ne.webp`, `sw.webp`, `se.webp`, `bonfire-clearing.webp`).

## Exact prompts and source images

- `/workspace/sites/safety-last/artwork-archive/foliage-v4/prompts.json` — all eight final foliage prompts.
- `/workspace/sites/safety-last/artwork-archive/camp-ground-v2/prompts.json` — whole-map and four-quarter ground edits.
- `/workspace/sites/safety-last/artwork-archive/camp-ground-v2/clearing-prompt.json` — final bonfire clearing edit.
- Original ImageGen outputs are copied alongside these manifests. Packaging scripts handle alpha cleanup, cropping, resizing, registration and WebP encoding; runtime assets do not depend on transient generation paths.

## Verification

Automated checks preserve 110 fixture placements, pass the identical collision-map check, preserve deletion and edits on reload, round-trip both migration markers, verify grounded mesh motion on all eight new assets, and check scene culling and whole-map sprite rendering. The eight new sprites total 738,360 bytes.

The editor supports 5,000 objects and a shared 2 MB import/save limit. The scene list pages its rows and memoizes filtering. Foliage rendering queries spatial cells; distant whole-map plants use ordinary sprites. Animated contact remains active nearby. Non-foliage ground, building, chest and step-on subsets are cached. Undo retains immutable layout snapshots.

The built production Worker and real SQLite passed save/load with 4,200 objects (above the old 500 KB limit), all 18 asset IDs, migration marker preservation, and unauthorized/stale/oversized request rejection. The production build and TypeScript checks passed.

Visual QA uses the real software Skia renderer: full-map, dense path in day/night, front/behind boot overlap, and walking/sprinting video. Four uploaded building/fire placements could not be fetched in this environment and are omitted only from the disposable QA render; they remain in the production layout. This is not a browser or iPhone frame-rate measurement.

QA files: `/workspace/sites/safety-last/docs/qa/foliage-v4/`.
