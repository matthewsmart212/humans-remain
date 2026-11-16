# Vegetable crop artwork

Generated with the built-in image generator using the real four-bed garden as the style and camera reference. The unmodified RGBA source is `growth-atlas.png`.

Prompt: create a transparent 4-column, 3-row game atlas matching the garden’s hand-painted earthy style and three-quarter top-down camera. Row 1: potato seedling, young, growing, harvest-ready flowering plant. Row 2: carrot seedling, young, growing, harvest-ready plant with orange shoulder. Row 3: picked potato soil, picked carrot soil, potato inventory item, carrot inventory item. Keep roots anchored consistently, silhouettes separate, and omit fences, backgrounds, text and labels.

Run `python scripts/extract-vegetable-crops.py` to slice the original cells to 256px lossless WebP sprites, preserving source transparency. Inventory items are cropped and centered separately. Runtime images live in `public/survival/vegetable-crops-v1/` and are bundled in `native/crop-art.ts`.

There are four growth sprites per crop. Stages change at planting, 60 seconds, 144 seconds and 240 seconds. Each of the four garden beds contains one independent planting with four visible plants, consumes one vegetable, and yields four of the same vegetable. Harvest never shifts crops between beds. Wild mature plants yield one vegetable and become picked soil. Potatoes and carrots can both be eaten or replanted.

The garden’s broken and repaired illustrations, placement, fences and paths are retained. No second garden upgrade is offered.
