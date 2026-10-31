# Circular wall geometry guides

These are geometric scaffolds, not finished painted game assets. Regenerate with `node artwork-archive/circular-wall-kit-v1/geometry/build-guides.mjs` from the repository root. The script uses the existing `sharp` and `@napi-rs/canvas` dependencies.

Sixteen sectors cover 22.5 degrees each, numbered clockwise from north. Each source canvas is 1536 × 1536 at exactly 1.4 pixels per world unit; individual orientations are never rescaled. The ground ring has radius 1650 and thickness 80. Projection is x = X, y = Y − z, preserving a circular ground footprint and upright timber. Stone height is 40; timber tops are deterministically varied around a total height of 180.

Each piece owns three posts (start, one-third and two-thirds of its angle). The endpoint post belongs to the next piece. Stone and plank infill extend 8 world units underneath that next post. The manifest distinguishes the nominal mathematical end plane from this intentional overlap.

`manifest.json` records projected geometric bounds, actual nontransparent pixel bounds, crop centres, ground-midpoint anchors, exact ground endpoints, fixed-scale placement data, collision centreline samples and seam validation. Coordinates are relative to the shared centre (0,0); a recommended world centre is also recorded from the camp audit.

`assembled-clay-ring.png` is a depth-buffered rendering of the complete geometric ring. `guide-contact-sheet.png` displays every separate guide with diagnostic labels outside the source images. Individual guides have genuine alpha and no labels, terrain, backdrop or frame.

These guide dimensions and endpoints do not certify that a subsequent AI-generated image will preserve the same geometry. Inspect the painted output and assembled joins separately. No live game files or placements are changed by this script.
