# Regional terrain colour

The user approved the terrain texture but found the zoomed-out world too orange. This pass keeps the same three source images, stamp sizes, rotations, overlaps, original camp artwork, saved placements and playable bounds. It changes only how surrounding ground colour is rendered.

`src/world-ground-colour.ts` provides one compiled Skia colour shader over the existing material shader. It uses world coordinates, broad elliptical regions and gently warped boundaries. Green meadow/lowland/village areas and brown logging/industrial/scrap areas ease into one another across several terrain squares. The camp remains a warm clearing. Colour does not reset when a texture is rotated, mirrored or crossed.

No foliage, roads, extra terrain images or full-world bitmap were added. The colour pass shares the existing draw call and preserves the source texture detail. The original camp tiles do not use this colour shader.

Verification: TypeScript, production CanvasKit overview and 15 focused views at gameplay/detail scale, including camp edges, a four-square intersection, portrait and night. Pixel averages verify that the meadow and western lowland read green and that logging ground is darker than camp. `render-checks.json` records the captured views and measurements. Original terrain image files and movement/save/placement source are unchanged from v129.

There was no browser automation or physical iPhone performance test. Roads, water, district buildings and foliage remain future separate work.
