# Roads embedded into their surroundings

The v136 road textures looked like clipped strips laid on the ground. This revision uses five complete painted road sections with intact edge stones, soil bedding, small contact shadows and irregular shoulders. The artwork bends along the existing road network. Outer soil is translucent so the existing terrain remains visible between the painted chips.

Generation used **built-in ImageGen**, with the original camp path as the style reference. Exact prompts and generated source paths are in [prompts.json](../../../artwork-archive/road-sections-v2/prompts.json).

| Road | Source PNG | Runtime WebP |
| --- | --- | --- |
| Camp stone | `artwork-archive/road-sections-v2/camp-stone.png` | `public/survival/road-sections-v2/camp-stone.webp` |
| Worn earth | `artwork-archive/road-sections-v2/dry-earth.png` | `public/survival/road-sections-v2/dry-earth.webp` |
| Woodland earth | `artwork-archive/road-sections-v2/dark-earth.png` | `public/survival/road-sections-v2/dark-earth.webp` |
| Factory gravel | `artwork-archive/road-sections-v2/works-gravel.png` | `public/survival/road-sections-v2/works-gravel.webp` |
| Salvage earth | `artwork-archive/road-sections-v2/salvage-gravel.png` | `public/survival/road-sections-v2/salvage-gravel.webp` |

All images are 1024 × 1536, with transparent shoulders and no foliage or props. Runtime files total 3,004,460 bytes, and their alpha channels match the source PNGs exactly. They are optional background detail and add nothing to the editor-entry image requirements.

`node scripts/check-world-roads.mjs` checks the 42-section network, seven connected districts, six bridge reservations, five road-free areas, mesh UVs and material weights. It renders the actual production CanvasKit scene at the camp joins and in each district, and compares the original camp interior pixel-for-pixel with roads hidden. TypeScript and the production build are also checked before publishing.

These are modular reusable road sections, not bespoke images for every stretch. River water, bridge decks and future district buildings remain outside this work. Browser and physical iPhone testing were unavailable; the captures use the production software renderer.
