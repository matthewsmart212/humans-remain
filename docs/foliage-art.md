# Camp foliage artwork — v1

Three new reusable, transparent sprites generated with the built-in image-generation tool on 2026-10-13. No CLI fallback, code-painted sprites, or terrain/character alterations.

## Sources and runtime assets

| Asset | Native generated size | Alpha crop (x, y, w, h) | Runtime file / dimensions | Ground root (normalised) | Suggested world size |
| --- | --- | --- | --- | --- | --- |
| Broadleaf | 1424 × 1105 | 78, 165, 1284, 790 | `public/survival/foliage-v1/broadleaf.webp` / 384 × 236 | 0.4735, 0.7823 | 78 × 47.938 |
| Fern | 1426 × 1103 | 31, 132, 1385, 891 | `public/survival/foliage-v1/fern.webp` / 384 × 247 | 0.5004, 0.8878 | 92 × 59.177 |
| Grass | 1254 × 1254 | 57, 177, 1143, 955 | `public/survival/foliage-v1/grass.webp` / 256 × 214 | 0.5083, 0.8890 | 58 × 48.484 |

Original generated PNGs are retained in `artwork-archive/foliage-v1/{broadleaf,fern,grass}-source.png`. These are the exact generated originals including their alpha. Generation outputs were respectively `exec-6205ea6d-bdfe-4fb0-af1b-4dd724eac89d.png`, `exec-7e3bcda3-ac73-4e3d-82ae-06f6ad0b2a8a.png`, and `exec-e1289f8c-cfc6-4459-b522-753ec3e74545.png`.

The runtime metadata is `src/foliage-art.json`. Ground-root points were visually inspected against the stem convergence points in the originals: broadleaf (686, 783), fern (724, 923), grass (638, 1026). The foreground broadleaf leaves naturally extend below their root. Grass has 40 source pixels of extra bottom transparency so its anchor remains near 90% of the canvas.

## Mechanical packaging

Run `node scripts/package-foliage-art.mjs` to reproduce from archived sources. The optional first argument supplies the original generator directory for initial archival copying. Packaging only removes generator alpha specks below 8/255, alpha-trims with a 24-source-pixel safety margin, downsizes using Lanczos3, canonicalises completely transparent RGB after resampling, and writes lossless WebP. It does not repaint, recolour or regenerate any visible leaf. Native leaf artwork and soft antialiasing are retained. Combined runtime WebP size is 233,808 bytes (about 228 KiB).

The WebP encoder may store arbitrary RGB beneath alpha zero; these pixels are transparent. Alpha-composited QA confirms no opaque ground block or background. All silhouettes fit inside their canvases and all original images include genuine alpha.

## Visual references

Both `public/survival/painted-terrain-hd/nw.webp` and `public/survival/painted-terrain-hd/preview.webp` were inspected before generation, then supplied in that order as style references. The assets follow the existing warm olive / ochre-green palette, painterly leaf contours, and upper-left daylight. They are deliberately low, walk-through vegetation; no dirt disk, flower, prop, or solid collision belongs to this art set.

## Final built-in prompts

### Broadleaf

Use case: stylized-concept. Asset type: transparent 2D foliage sprite for a hand-painted top-down survival camp game.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: match their warm olive and yellow-green vegetation, dark fine painterly contours, earthy saturation, and readable leaf shapes. Do not reproduce or edit their terrain.
Scene/backdrop: genuine transparent background with alpha, absolutely no opaque backdrop, no checkerboard painted into image.
Style/medium: polished hand-painted 2D game artwork matching the references; simple clear silhouette at small game sizes, dimensional painted highlights, not photorealistic, not glossy 3D. High three-quarter / almost top-down view looking down at approximately 55-65 degrees.
Lighting: consistent diffuse daylight from upper left; dark green undersides and restrained golden leaf highlights.
Composition: exactly ONE isolated plant clump centered, all tips intact with ample transparent margin. Growth fans upward and sideways from a small root/crown near lower-center, at about 83% of plant height. Low knee-high vegetation. No characters, text, frames, labels, pots, ground disc, dirt tile, soil heap, flowers, rocks, props, detached debris, or large cast shadow.
Primary request: ONE small broadleaf woodland clump, approximately 18-24 rounded oval/spoon-shaped leaves in a loosely asymmetric low rosette, 3 small connected stems. Olive and moss green leaves with a few warm ochre-green highlights, exactly the soft broad leaf character of the reference. The clump is wider than tall, roughly 1.3:1. The foreground leaves can overlap the root point naturally. Keep leaves big enough to remain readable at a runtime width around 90 pixels; avoid excessive tiny leaf detail.

### Fern

Use case: stylized-concept. Asset type: transparent 2D foliage sprite for a hand-painted top-down survival camp game.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: match their warm olive and yellow-green vegetation, dark fine painterly contours, earthy saturation, and readable leaf shapes. Do not reproduce or edit their terrain.
Scene/backdrop: genuine transparent background with alpha, absolutely no opaque backdrop, no checkerboard painted into image.
Style/medium: polished hand-painted 2D game artwork matching the references; simple clear silhouette at small game sizes, dimensional painted highlights, not photorealistic, not glossy 3D. High three-quarter / almost top-down view looking down at approximately 55-65 degrees.
Lighting: consistent diffuse daylight from upper left; dark green undersides and restrained golden leaf highlights.
Composition: exactly ONE isolated plant clump centered, all tips intact with ample transparent margin. Growth fans upward and sideways from a small root/crown near lower-center, at about 83% of plant height. Low knee-high vegetation. No characters, text, frames, labels, pots, ground disc, dirt tile, soil heap, flowers, rocks, props, detached debris, or large cast shadow.
Primary request: ONE low woodland fern, five to seven gently arching fronds in an asymmetric fan, broad rounded readable leaflets with simplified painted veins. Warm moss-green and olive, with a restrained ochre-green sunlit edge. Not tropical, not feathery or micro-detailed. Wider than tall, about 1.3:1. Clumped fronds emerge from one small lower-center crown; this will gently bend at that crown. Keep leaflets chunky and readable at a runtime width of about 100 pixels.

### Grass

Use case: stylized-concept. Asset type: transparent 2D foliage sprite for a hand-painted top-down survival camp game.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: match their warm olive and yellow-green vegetation, dark fine painterly contours, earthy saturation, and readable leaf shapes. Do not reproduce or edit their terrain.
Scene/backdrop: genuine transparent background with alpha, absolutely no opaque backdrop, no checkerboard painted into image.
Style/medium: polished hand-painted 2D game artwork matching the references; simple clear silhouette at small game sizes, dimensional painted highlights, not photorealistic, not glossy 3D. High three-quarter / almost top-down view looking down at approximately 55-65 degrees.
Lighting: consistent diffuse daylight from upper left; dark green undersides and restrained golden leaf highlights.
Composition: exactly ONE isolated plant clump centered, all tips intact with ample transparent margin. Growth fans upward and sideways from a small root/crown near lower-center, at about 83% of plant height. Low knee-high vegetation. No characters, text, frames, labels, pots, ground disc, dirt tile, soil heap, flowers, rocks, props, detached debris, or large cast shadow.
Primary request: ONE modest meadow grass tuft, 12-16 visible tapering blades in three little connected fans emerging from a single short lower-center root. Mix medium olive-green, moss-green and a few muted straw-yellow tips; match reference vegetation palette. Not a dense bush and not tall reeds. Thin curved blades but with enough width to read at a runtime width of about 60 pixels, pointed ends, uneven organic silhouette, about as wide as it is tall. No flowers, seed heads or scattered loose blades.

