# Circular camp wall: six-road installation

This archive contains the painted road-end variants used to install the approved mossy timber-and-stone circular wall in Humans Remain. It adapts the existing 16-piece kit to the camp's six road openings. Original full-circle artwork remains available in `artwork-archive/circular-wall-kit-v1` in the GitHub project.

## Contents

| Location | Contents |
| --- | --- |
| `generated/` | Twelve untouched ImageGen PNG outputs: eleven selected road variants and the first, superseded wall-11 pass. |
| `prompts.json` | Exact prompts, edit targets, style references, original tool output paths, and selection decisions for every generation. |
| `geometry/` | Sixteen deterministic geometric guides, guide-generation script, retained arc intervals, anchors, post counts, and circle placement data. |
| `process-art.mjs` | Mechanical registration, alpha inspection, PNG/WebP encoding, runtime metadata, and actual-sprite preview assembly. |
| `registration-report.json` | Source/output SHA-256 hashes, alpha/component checks, fit ratios, crop bounds, and verification results. |
| `previews/installed-wall-assembly.png` | Actual transparent assembly, 4852 × 5139 pixels. |
| `previews/installed-wall-review.jpg` | Readable complete-ring review on a solid background. |
| `previews/contact-sheet.png` | All sixteen finished wall sections. |
| `previews/seam-detail-sheet.png` | Native-detail windows at the ten ordinary section joins. |
| `previews/entrance-detail-sheet.png` | Native-detail windows at the six open road entrances. |

The runtime PNG and lossless WebP files for the eleven shortened variants are under `public/survival/camp-circular-wall-install-v1/`. Its manifest lists all sixteen runtime images, including five reused files from `public/survival/camp-circular-wall-v1/`.

## Reused and new art

Sections **01, 04, 05, 13 and 16** reuse the original approved PNG/WebP files unchanged. Their new-plan ground midpoints and placement values are identical to their original values.

Sections **02, 03, 06, 07, 08, 09, 10, 11, 12, 14 and 15** use newly generated, shortened artwork. Each exposed road end has a substantial iron-banded pointed post. Section 11 has two exposed ends. Ordinary joins keep the original shared-post ownership.

Wall 11's first pass had a diffuse background halo. That unmodified output is retained as `generated/wall-11-first-pass.png`. A dedicated ImageGen background-removal edit produced the selected `generated/wall-11.png`; both prompts and source paths are recorded.

## Reproduce the packaged assets

The game consumes the checked-in PNG/WebP files and does not require ImageGen or the optional art-packaging libraries at runtime. Packaging was performed with Node **24.22.1**, `sharp` **0.35.5**, and `@napi-rs/canvas` **0.1.100**. From the repository root, install the optional tooling without changing the application dependency manifest or lockfile:

```bash
npm install --no-save --package-lock=false sharp@0.35.5 @napi-rs/canvas@0.1.100
node artwork-archive/circular-wall-install-v1/process-art.mjs
```

The command reads the preserved selected originals and guide manifest. It rewrites the eleven packaged PNG/WebP pairs, their manifest, `src/camp-circular-wall-art.json`, the registration report, and the assembled review images. It does not call ImageGen. Exact image-generation prompts are preserved for future art changes, but another model generation is not guaranteed to reproduce identical painted pixels.

For incomplete art work, `--partial` allows preview generation without overwriting `src/camp-circular-wall-art.json`. A full run refuses to complete if any selected variant is missing.

Guide generation is separately documented in `geometry/README.md`. Rebuilding guides requires the original kit's `geometry/` directory; the guide builder accepts its path as an optional argument when that original archive is in a separate checkout.

## Registration and runtime geometry

The mathematical ground centreline uses radius **1650 world units**, angle zero at north, and clockwise angles. The original fixed camera and **1.4 pixels per world unit** are retained. Guide canvases are 1536 × 1536. The new ImageGen originals are 1254 × 1254; they remain unchanged in `generated/`.

Packaging finds the dominant alpha component's bounding rectangle, resizes that rectangle to the guide's bounds, and places it on the fixed guide canvas. It then trims the delivery image with 20 pixels of transparent padding. Original intact assets keep their original padding and file bytes. No wood, stone, moss, post or other artwork is painted by the packaging script.

`src/camp-circular-wall-art.json` contains each image's dimensions, normalized ground anchor, retained start/end angles, fixed drawing order, 25 local ground-curve samples, 24 collision/fade segments, and normalized collision polygons. Curves and anchors use each retained arc's actual midpoint. The physical foundation uses a 34-point annular polygon; road-end posts add exact 49-unit square foot polygons. This is more precise at the openings than extending the full foundation width to encompass a post. Vertical occlusion rise is 200 world units.

## Checks and visual limits

The processor verifies real alpha transparency, validates all normalized collision coordinates, records source and output hashes, confirms source files are unchanged, and compares visible RGB plus alpha between PNG and lossless WebP. The complete run contains eleven new variants, five reused originals, and no missing sections.

The assembled proof and all entrance/ordinary-join sheets were inspected. All six entrances have finished end posts and remain visually open. The artwork has intentionally irregular wood and stones. Small stone-height steps remain at the 01/02 and 15/16 joins, with no visible through-wall opening; the reused 04/05 join keeps the original rough stone transition. Bounding-box registration aligns the overall arc bounds and does not make every hand-painted edge or internal post mathematically identical to the guide.

The report flags the following horizontal-versus-vertical registration adjustments for visual review: wall 08 **−8.39%**, wall 11 **−11.92%**, and the narrow, nearly edge-on wall 12 **−19.49%**. These images were reviewed in the complete assembly and detail sheets. Collision and world placement are calculated from the geometric plan, independently of painted texture variation. In-game traversal, depth ordering, saved-run migration, and publication are validated by the runtime integration workflow.

All wall images are local assets. No external art URL or hosted image service is required to display these wall sections.
