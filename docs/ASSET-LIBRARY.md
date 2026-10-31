# Current camp asset library

The library was simplified against saved draft revision 50 on 10 October 2026.

- 22 placed objects are unchanged, representing 18 distinct camp assets.
- The active library contains those 18 assets plus the existing Scrapling robot.
- Seven used wall shapes retain tiers 1 and 2. All 11 placed wall copies switch together. Tier 3 is removed from placement and tier controls.
- Headquarters has only its current tier 1 design. Other unused building tiers and future planning entries are removed.
- Two unused custom records named Base wall 1 are retired; they were not in the draft.
- The public library, interactive library, artwork API and editor palette use the same active selection. New custom uploads are accepted immediately without requiring placement.

The catalogue now has 12 built-in entries, down from 283, plus seven uploaded wall entries. Removed production records and the source draft are archived in docs/archive/asset-library-cleanup-2026-10-10. Original game sprites remain resolvable internally through legacy-world-art.json for older saves and the original survival mode; they are absent from the current library and placement palette. Uploaded image bytes and historical database revisions are retained so this cleanup cannot destroy a source image or placed asset.

Run node scripts/check-asset-library-cleanup.mjs for regression checks covering the exact 19-entry palette, unchanged saved placements, fixed wall bounds/collisions across both tiers, retired API records, new uploads, public HTML and original survival artwork. TypeScript and the production build are also checked before publication. Browser and iPhone Safari interaction testing were not available in this environment.
