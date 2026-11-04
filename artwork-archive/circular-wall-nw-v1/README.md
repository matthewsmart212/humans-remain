# North-west foundation material match

Section 15 used small, regular stone blocks beside section 16's larger rough stones. The versioned replacement matches the adjoining stonework, using a built-in ImageGen edit of section 15 with section 16 as its material reference.

`generated/wall-15-stonework.png` is the untouched ImageGen output. `register-stonework.mjs` registers it to the existing 670 × 672 sprite, then retains only foundation pixels inside the recorded mask. Every alpha byte and every pixel outside that mask comes from the existing dark sprite. The road-end and intermediate wooden posts have explicit exclusion hulls.

The original dark sprite remains at `public/survival/camp-circular-wall-weathered-v1/wall-15.png`. Re-run registration from the repository root with `node artwork-archive/circular-wall-nw-v1/register-stonework.mjs`. The script requires the same optional `sharp` and `@napi-rs/canvas` artwork dependencies as the existing wall processors.

The runtime asset ID, dimensions, anchor, draw order, ground curve, collisions and every camp placement remain unchanged. Only section 15's image URL changes. A new URL avoids retaining the old image in a browser cache; legacy web URLs redirect to it. The native bundle is regenerated from the unchanged bundled world snapshot.
