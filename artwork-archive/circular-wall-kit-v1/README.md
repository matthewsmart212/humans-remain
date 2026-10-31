# Humans Remain — circular wall asset kit v1

This asset kit develops the approved irregular, sharpened oak wall above a low mossy stone base into **16 separately painted orientations**. It is a fixed-orientation, closed-ring kit: its intended assembly is one complete circle made from sixteen 22.5° sections.

**Status: accepted for the documented standalone assembly.** All sixteen orientations have been visually reviewed at the fixed anchors, scale and draw order recorded with this kit. The review accepts the irregular painted joins as game artwork; it does not certify a pixel-perfect painted circumference or live-game integration. This directory does not install the wall into the game.

`visual-review.json` records the acceptance decision for the exact source, sprite and assembled-preview hashes listed in it; `visual-review.md` explains the findings and limitations. Consult `registration-report.json` and the runtime-folder `manifest.json` for packaging details and retained warnings. The export requires `approvalStatus: "accepted"` and matching current bytes. If artwork or assembly changes, repeat the affected visual review and update its hashes before exporting again.

## Contents and file locations

The kit uses two repository-relative directories:

| Location | Purpose |
| --- | --- |
| `public/survival/camp-circular-wall-v1/` | Individual transparent `wall-01` through `wall-16` PNGs and lossless WebPs, plus the placement manifest. |
| `artwork-archive/circular-wall-kit-v1/generated/` | Untouched generated PNG originals used to make the delivery assets. |
| `artwork-archive/circular-wall-kit-v1/reference/` | The approved spiked, mossy wall design reference. |
| `artwork-archive/circular-wall-kit-v1/geometry/` | Exact geometry specification, orientation guides, guide-generation script and clay assembly previews. These guides are scaffolds, not finished artwork. |
| `artwork-archive/circular-wall-kit-v1/previews/` | Assembly, exploded view, contact sheet and any retained join-review images. The assembly uses the actual individual delivery images. |
| `prompts.json` and `production-spec.json` in this directory | Generation instructions and production choices retained with the source artwork. |
| `registration-report.json` in this directory | Source/output metadata, alpha checks, registration operations, checksums, warnings and packaging validation. |
| `camp-fit-audit.md` and `camp-fit-audit.json` in this directory | Suggested camp centre, headquarters clearance and road-intersection findings for later placement work. |

PNG and WebP are alternative encodings of each section; use one format per section. The packaging script checks that the lossless WebP preserves the PNG's visible pixels and alpha. The opaque design-reference background is not part of the transparent delivery assets.

## Circle geometry

| Property | Value |
| --- | --- |
| Centreline radius | 1,650 world units |
| Nominal stone-base thickness | 80 world units |
| Nominal inner / outer radius | 1,610 / 1,690 world units |
| Sections | 16 × 22.5° = 360° |
| Angle convention | 0° at north, increasing clockwise |
| Ground projection | Equal X/Y scale; the ground footprint remains circular |
| Vertical projection | Upright height extends upward: screen X = X, screen Y = Y − z |
| Registration scale | 1.4 pixels per world unit |
| Local assembly centre | `(0, 0)` |
| Suggested camp centre | `(1718.1675873489273, 1573.5124773329626)` — the audited bonfire position |

`wall-01` covers 0–22.5°, `wall-02` covers 22.5–45°, and the sequence continues clockwise to `wall-16` at 337.5–360°. Mathematical ground coordinates follow:

```text
x = centreX + radius × sin(angle)
y = centreY − radius × cos(angle)
```

The geometry guides use three bays per section. A section owns its starting junction post and the posts one-third and two-thirds along the arc. The following section owns the ending junction post. There is a small nominal overlap of 8 world units beneath the next post; do not add a second complete post at every shared junction.

The radius was selected to clear the audited headquarters footprint. It remains a candidate for final placement: the whole camp, foliage, roads and gameplay circulation have not been migrated or comprehensively retested for this ring.

## Using the individual parts

1. Load the runtime-folder `manifest.json` and the chosen PNG or WebP files from that same folder.
2. Use each asset's `width`, `height`, `anchorNormalized` and `placement` values. The `width` and `height` are world dimensions; `size` is the trimmed image size in pixels. Anchors refer to the section's **ground midpoint**, not the visual centre of its timber.
3. For a local-origin assembly, use `placement.x` and `placement.y`. For the audited camp proposal, use `recommendedWorldPlacement`, or add a chosen common centre to every local placement.
4. Keep **rotation at 0** and **both flips disabled**. Each image already depicts its own position around the circle. Rotating one painted sprite would also rotate its upright posts, grain and lighting.
5. Preserve the same scale for all sixteen parts. To resize the entire kit by a factor `k`, multiply every local position and every world width/height by `k`, then add the common centre. Changing only the radius or scaling sections independently will break the joins.

For a renderer whose drawing coordinates already use world units, the image's upper-left position is:

```js
const left = centreX + asset.placement.x
  - asset.anchorNormalized[0] * asset.width;
const top = centreY + asset.placement.y
  - asset.anchorNormalized[1] * asset.height;

ctx.drawImage(image, left, top, asset.width, asset.height);
```

The preview script draws complete sprites using stable ground-midpoint Y priority with explicit northern-junction ordering: `wall-15` before `wall-16`, `wall-16` before `wall-01`, and `wall-01` before `wall-02`. The actual full draw order is recorded in the assembly metadata. This is an assembly-review method, not a completed game depth/occlusion implementation. The manifest also includes exact nominal endpoints and sampled annular collision polygons; these describe the intended footprint independently of painted edge details.

## Precision and visual review

The shared centre, radius, sector angles, anchors and nominal endpoints are calculated from one geometry definition. These metadata define an exact nominal circle; the painted wall follows it approximately, with intentionally uneven stones and timber plus some variation from image generation. `process-kit.mjs` measures the original alpha bounds, registers the complete visible image to its matching guide bounds, adds transparent padding and writes the two output encodings. It does not repaint the wall or alter the retained original.

**Bounding-box registration does not prove that every stone, post or internal curve meets perfectly.** Review the assembled images at all sixteen junctions, including the more overlapping east and west orientations. The report flags significant aspect changes for inspection. The script's analytical seam checks validate the geometry; painted join acceptance must be recorded separately after visual review.

## Rebuilding guides and delivery images

Run these commands from the repository root. The artwork scripts require Node.js plus `sharp` and `@napi-rs/canvas`. Those libraries are production-tool dependencies and are not currently declared as dependencies of the game app.

For an isolated tools installation outside the checkout, a macOS/Linux shell example is:

```bash
npm install --prefix ../humans-remain-wall-tools --no-package-lock sharp @napi-rs/canvas

NODE_PATH="$(cd ../humans-remain-wall-tools/node_modules && pwd)" \
  node artwork-archive/circular-wall-kit-v1/geometry/build-guides.mjs

NODE_PATH="$(cd ../humans-remain-wall-tools/node_modules && pwd)" \
  node artwork-archive/circular-wall-kit-v1/process-kit.mjs
```

If those libraries are already resolvable in the environment, the commands are simply:

```bash
node artwork-archive/circular-wall-kit-v1/geometry/build-guides.mjs
node artwork-archive/circular-wall-kit-v1/process-kit.mjs
```

The full packaging command requires all sixteen originals in `generated/`. During production, `--partial` allows an explicitly incomplete pilot assembly:

```bash
node artwork-archive/circular-wall-kit-v1/process-kit.mjs --partial
```

These commands reproduce the guides and mechanical packaging from the retained originals. They do not regenerate the AI artwork from its prompts. Preserve the generated originals if identical artwork is required.

## Integration work still required

This is the unbroken-circle asset kit. It does **not** include the shortened road-opening variants or finished end caps needed at the camp's six road crossings. Removing a whole 22.5° section would create a substantially wider gap than the intended roads. Use the audit's candidate intersection ranges when producing properly finished shorter variants; check them against the actual painted roads before final placement.

The assets have not been registered in the editor, placed into the saved world, substituted for the existing walls or deployed. No gates have been created or added. The current game's wall depth/fade logic uses a first-segment chord and needs review for curved sections during integration. Collision behaviour, player occlusion, attacks and any repair/damage states also require implementation-specific validation at that stage.

## Download and repository handling

A standalone package should preserve both directory trees above so the original artwork, manifests, scripts and ready-to-use images remain together. Extract the package into an empty directory to review it, or merge those two new folders into a project checkout. The archive is an asset kit, not a replacement for the whole game project.

The repository already tracks PNG and WebP files with Git LFS. After cloning, use `git lfs install` and `git lfs pull` to obtain real image bytes if needed. Keep generated originals and final delivery assets in the repository; avoid adding the download ZIP redundantly when the same files are already tracked individually.

### Create a verified download archive

After all sixteen assets are packaged and `visual-review.json` explicitly records both `"reviewed": true` and `"approvalStatus": "accepted"`, run the standard-library export script. Choose a destination outside the repository; the `--output` argument makes the command portable between computers:

```bash
python artwork-archive/circular-wall-kit-v1/export-kit.py \
  --output ../humans-remain-circular-wall-kit-v1.zip
```

The script checks the manifest, all 32 delivery images, 16 original images and 16 geometry guides before creating an archive. The review must identify all sixteen sections exactly once and bind every PNG, WebP, source original and the assembled circle preview to its current SHA-256. Stale approval cannot authorize changed artwork. The script checks those bindings again against its payload plan before writing the ZIP.

It preserves both repository-relative folders inside a `humans-remain-circular-wall-kit-v1/` ZIP root and adds a root README copy plus `FILE-INVENTORY.json`. Temporary files, discarded variants, caches, environment files and nested archives are excluded.

The inventory records the size and SHA-256 of every payload file. Its own size/hash are recorded in the external receipt because an inventory cannot contain its own valid hash. The script runs the ZIP integrity check, reopens the archive, verifies the complete entry list and hashes every entry, then writes an adjacent `.completion.json` receipt containing the archive hash and verification results. It does not modify source artwork or mark an incomplete set as complete.
