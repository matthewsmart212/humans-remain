# Ground below the central camp

Two connected outdoor terrain pieces, generated using built-in image_gen edits.
Prompts are in `generation-prompts.json`; original outputs, registered patches
and the lossless master are retained here. The runtime files are
`public/survival/maps/south-camp-v1/20-camp-south-clearing.webp` and
`public/survival/maps/south-camp-v1/21-camp-south-trail.webp`.

Four close-up passes keep native source detail near the intended terrain pixel
scale. `terrain-manifest.json` records every native size and enlargement factor.
The assembled master is not a single native generation. No sharpening, noise
or procedural ground painting was used. Sharp prepares actual neighbouring
contact strips, registers preserved pixels, stitches and packages losslessly.

Piece 20 reaches west from the existing southeast meadow. Piece 21 extends the
camp's southern stone exit into a narrow dirt footpath, with broad free ground
on both sides. The northern overlap begins before the camp's baked dark edge,
so the edge is covered without changing the camp texture or saved objects.
The east contact includes the existing approach and meadow transition.

Regenerate templates in NE, NW/SE, SW order with `prepare-south-camp.mjs`.
Register each selected image, then run `stitch` and `package-south-camp.mjs`.
The package checks zero pixel error over the 132-column shared contact,
the 36-row northern feather and the 36-column eastern feather.

Next: complete the remaining southwest corner, then the western and northern
camp edges. No circular road is implied by the surrounding terrain.
