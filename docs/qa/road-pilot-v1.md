# Southeast road-and-terrain pilot

One bespoke patch replaces the visible treatment at the southeast camp exit. The other roads retain their existing implementation pending visual approval. This is not a completed whole-world road redesign.

- Registered source rectangle: x4100, y4000, 1536 × 1024 pixels.
- Fixed artwork at the camp's native source scale; no repeated texture or curved UV stretching.
- Original camp interior (source x/y ≤4450) is protected by the rendering mask.
- Ground blends over the outer 96 pixels. At the far end, paving breaks up into a dirt track using opaque stones rather than dissolving the stones themselves.
- No added foliage, structures, collision changes, district moves or saved placement changes.
- One 691,996-byte WebP, loaded with optional terrain detail, not editor entry artwork.

## Artwork provenance

Generated and refined with the built-in ImageGen tool using actual production-rendered terrain and the original camp exit as references.

- Source: `artwork-archive/road-pilot-v1/southeast.png`
- Runtime: `public/survival/road-pilot-v1/southeast.webp`
- Exact prompts and references: `artwork-archive/road-pilot-v1/prompts.json`
- Repackage: `node scripts/package-road-pilot.mjs`

## Verification

Run `npm run typecheck` and `node scripts/check-world-roads.mjs --pilot-check`.
The latter renders the real CanvasKit terrain path, checks the original camp interior against roads disabled, and checks all existing route geometry, district connections, six bridge reservations and five quiet areas.

Installed view: `docs/qa/world-roads-v3/pilot-installed.webp`.
No browser automation or physical iPhone test is available in this environment. The pilot requires the owner's artistic review at playing zoom before expanding this approach.
