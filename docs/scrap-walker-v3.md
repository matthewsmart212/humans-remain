# Scrap Walker v3 directional artwork

The humanoid robot from the supplied reference: chipped yellow helmet and shoulders, two red visor lenses, dark torso, teal/orange oversized fists, and two broad boots. This asset is separate from Scrap Bomber.

## Runtime contract

- Root: `/survival/scrap-walker-v3/`; `atlas.json`, five WebP sheets, and `thumbnail.webp`.
- Each atlas: 1536×1152, four columns × three rows, 384×384 cells; common anchor `[192,320]`; whole-cell world display width 215. This compensates for the common .76 packing scale while preserving the full side punch.
- Source headings: down, down-left, right, up-right, up. Mirror down-left → down-right, right → left, and up-right → up-left. Rear headings hide all lenses.
- Frames 0–3 alternate-foot walk; frame 0 also planted idle. Frame 4 windup, 5 punch contact, 6 followthrough, 7 recovery; 8 recoil, 9 settle; 10 collapse, 11 defeated rest.
- `eyes[sourceHeading][frame]` is a list of `[x,y,r]` triplets in packed-cell coordinates. All 12 frames have entries; rear entries are empty. For mirrored rendering use `384-x`. Disabled front/profile lenses are baked lit in the art; the runtime can darken the supplied 10/11 lens positions. Coordinates were manually identified inside each visor, then locally refined. Rust patches are excluded by explicit lens ROIs.

## Reproduction and registration

Run `python3 scripts/prepare-scrap-walker-v3.py` with Pillow, NumPy, and SciPy. Original PNGs and source/reference provenance are in `art-source/scrap-walker-v3/`. The built-in imagegen tool produced every sheet using transparent-background mode. Four directional sheets used both the original reference and selected down master to preserve identity.

All generated sources are 1448×1086 (362px source cells). One .76 scale is used for all 60 poses and all five views; there is no per-pose or per-view fitting. The full side punch is 414 source pixels wide, which determines the common scale needed to retain alpha-safe margins. Each view uses one horizontal origin from its walk row. Only translations plant reviewed boot baselines; attack reach and recoil silhouette displacement are retained. The down windup hanging fist extends 3 source pixels below its boot, so the explicit boot correction prevents that fist from lifting the boots. All final silhouettes retain at least 8px alpha-safe margins. Cell placement, source bounds, and bytes are recorded in `atlas.json`.

## Validation

Five genuine-alpha source sheets contain 12 connected full-body poses each. Packed sheets have 60 unique poses, common 384px cells, grounded idle poses, the correct eight-heading mirror mapping, forward/profile lens landmarks, and empty rear lens arrays. A forest-background contact sheet confirms consistent design, comparable body volume, clear punch extension, and retained hit recoil. Parent runtime checks cover day/night rendering and combat.
