# Black road layout

Run `node scripts/check-world-roads.mjs` from the repository root to regenerate the captures and geometry report. The check uses the production terrain renderer on a CanvasKit software surface.

- All seven district nodes connect to camp.
- The rounded geometry crosses planned waterways only at the six reserved bridges.
- The full road outlines avoid the five designated quiet polygons.
- Six camp exits, two junctions, a crossing, a narrow trail and the entire world are captured for visual inspection.
- The original camp interior is pixel-identical with the black road layer enabled or disabled.
- The layer adds no new image files to game loading.

The black fill is temporary. Dirt/stone textures, water, bridge art and district buildings remain future work. No browser automation or physical iPhone performance test was available.

No image generation or artwork editing was used in this pass. Road outlines are code-native geometry derived from the existing plan.
