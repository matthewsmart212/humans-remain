# Approved headquarters furniture

Built-in image generation was used to isolate the exploration workstation and companion cubby from the approved room mockup. Full extraction prompts are in prompts.txt. The originals remain here; runtime WebP files live in public/survival/hq-furniture-v2.

The earlier user-approved chest strip has three equal 724 × 724 cells: closed, half-open, 45° open. prepare-approved-hq.mjs splits on exact cell boundaries, reuses the closed lower body/ground contact and composites an identical companion cubby behind each state on a fixed 960 × 960 canvas. The upper rim, lid and latch use the approved individual frames. No per-frame trimming or fitting occurs. The cubby is also available separately.

A targeted built-in edit removed the exploration bench's broad background haze. Prompt: Keep this exact exploration workstation, its shape, materials, artwork, layout, viewing angle and all objects unchanged. Remove only the broad brown/black fuzzy haze/halo/background around and between the parts. Genuine transparent background, crisp antialiased object silhouette. The lantern stays lit without broad environmental glow. Preserve board, pinned map and notes, table, compass, book, scrolls, cloth, storage compartment and legs; uncropped on the same landscape canvas.

Stable asset IDs replace the rejected v1 designs. Saved world placements are not written by this change. World Builder previews chest opening per placed instance; the state is temporary and independent of placement. Inventory and exploration menus are intentionally not implemented. The existing first-generation sources and URLs remain available for compatibility.
