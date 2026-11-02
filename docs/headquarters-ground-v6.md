# Headquarters settled foundation v6

The thin decorative fringe is replaced by a broad, uneven construction footprint: darker compacted mud next to the foundations, embedded ochre stones, mossy shoulders and a worn central approach. A separate weathered footing layer crosses and partially buries the lowest masonry. Five asymmetric clusters of existing camp ivy, fern and sage overlap the corners and lower stone edges. The central stairs remain clear.

Both layers and all dressing are attached to the hall transform. The soil draws below the foundation; the weathered facing and growth draw above its lowest stones but below actors. The roof and front panels still reveal the same persistent interior through the doorway. No changes to world placement, size, collision, walkability, furniture or saves.

Static assets are preloaded with the headquarters and bundled for offline native use. Existing foliage textures are reused. No new animated foliage, generated per-frame textures, blur pass or collision bodies are introduced.

## Artwork

Built-in ImageGen produced both new RGBA assets at 1536 × 1024; exported to WebP quality 90 / alpha quality 100:

- `public/survival/headquarters-south-v1/settled-ground-v6.webp`
- `public/survival/headquarters-south-v1/rooted-footing-v6.webp`

Soil prompt: A broad, uneven footprint of compacted warm umber/ochre mud, disturbed gravel, embedded ochre stones, damp moss and fallen leaves beneath the headquarters. Use the supplied game screenshot for style and terrain colour, and the building for footprint geometry. Soil shoulders extend 80–160 source pixels beyond the foundation, with asymmetric moss, low side ferns and a short scuffed central approach. Irregular alpha-frayed edges; transparent top and room center. No building, stairs, HUD, people, pale band, ornamental ring or hard rectangular silhouette.

Footing prompt: A transparent overlay registered to the original hall, with damp olive moss, creeping growth, packed umber soil and muddy splashes clinging to and partly burying the lowest stone course. Uneven thicker growth below the left crate, smaller patches below the right log store, and moss at the stair cheeks. Keep the central steps clear. Match the building's painted moss and masonry texture; no broad additional ground patch or continuous trim. The chosen output also supplies a weathered lower stone facing, aligned over the original foundation.

## Validation

Root/native TypeScript; shared renderer, stable doorway and foundation pixels through roof reveal; preload/offline registration for every new foundation detail; existing room navigation and save checks; production native rendering of repaired and ruined halls and intermediate entrance positions; web build and deployment/source parity. Captures in `docs/qa/headquarters-ground-v6/`. No physical iPhone test was available.
