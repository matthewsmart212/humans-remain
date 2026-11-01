# North-east replacement geometry

These two transparent PNGs are geometric inputs for painted artwork generation, not game sprites. Run `node artwork-archive/circular-wall-ne-v2/geometry/build-guides.mjs` from the repository root to reproduce them. The source kit is `artwork-archive/circular-wall-kit-v1/geometry` and an optional first argument can override that directory.

The circle radius is 1650 world units and its centre is unchanged. Section 02 spans 22.5–47 degrees; section 03 spans 57–67.5 degrees. The road opening is 47–57 degrees, with approximately 287.6 units between the end-post centres and 238.6 units after the nominal 49-unit post widths. Both exposed road ends own complete posts; the closed joins preserve their original shared-post ownership.

Each 1536-square guide uses 1.4 pixels per world unit. The fixed projection is screen X = X and screen Y = Y − height. Collision guides record the 80-unit annular foundation and endpoint allowance. Runtime collision uses a precise annular polygon plus separate square road-post feet rather than a sprite-sized rectangle.

The guide builder changes no existing source sprites or metadata. See the parent README for registration and saved-game compatibility.
