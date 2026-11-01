# Weathered timber colour update

This is a colour-only update to all sixteen installed circular camp wall sprites. It replaces their bright orange timber with muted, weathered brown that fits the HQ and workshop artwork.

## Preserved artwork and geometry

The final game sprites are derived from the original installed pixels. Nothing is resampled, cropped, moved, redrawn or regenerated. Every image dimension and every alpha byte is identical to its previous runtime WebP. The metadata's image URL is the only changed field: IDs, anchors, curves, dimensions, draw order, collision, road openings and world placements remain the same. Saved-game and world migration code is unchanged.

`original-art.json` records the previous metadata and source image paths. The original artwork remains in `public/survival/camp-circular-wall-v1` and `public/survival/camp-circular-wall-install-v1`.

## Colour process

The built-in ImageGen editor produced `imagegen-colour-reference.png` using wall 01 and the user's camp screenshot. Its prompt is preserved in `prompt.json`. This image establishes the wood palette; it is not substituted for the registered game sprite.

`recolour.mjs` transfers that palette onto the original timber pixels. `material-protection.json` contains manually traced protection polygons for stone foundations and iron bands, plus selected rivet circles. A soft hue/chroma selection protects green and yellow-green growth and neutral metal details. Protected pixels and all transparency remain unchanged. The same treatment is applied across the sixteen orientations, including the shortened road-end pieces.

`verification.json` records source and output hashes, dimensions, alpha hashes, changed-pixel counts and lossless WebP checks. `previews/colour-change-mask.jpg` marks changed pixels in pink for review. Manually traced material boundaries were also inspected visually at full resolution and in the game renderer.

## Outputs

- `public/survival/camp-circular-wall-weathered-v1/wall-01.png` through `wall-16.png`: full-resolution lossless authoring copies.
- The corresponding sixteen `.webp` files: lossless runtime assets shared by web and native.
- `public/survival/camp-circular-wall-weathered-v1/manifest.json`: asset paths and hashes.
- `previews/contact-sheet.jpg`: review of the complete set.

The deployment includes only the sixteen active WebPs. Source originals, PNG copies and review files stay in the development project. The previous active URLs redirect to their new equivalents, and versioned URLs avoid stale browser caches. No database content is changed.

## Reproduce

From the repository root, install the optional artwork tools if they are not already available, then run:

```sh
npm install --no-save --package-lock=false sharp@0.35.5 @napi-rs/canvas
node artwork-archive/circular-wall-weathered-v1/recolour.mjs
npm run build
```

These optional tools are for artwork preparation; the game's normal dependency manifests and installation commands remain unchanged. The script also supports the existing Codex runtime's dependency directory when present. It verifies decoded visible RGB and every alpha byte after lossless WebP encoding.

For a local visual review, start the normal development server and open `/scripts/circular-wall-qa.html`. That development-only page uses the production Skia renderer and the previously reviewed camp snapshot. It is not part of the published game entry point.
