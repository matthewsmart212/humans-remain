# Headquarters entrance transition v3

The previous cutaway exposed a much deeper room and replaced the entire silhouette at once. The corrected cutaway retains the same front foundation, exterior supplies and central steps. Only the roof and high front panels fade, with a continuous reversible reveal over the entrance steps, fully clear by the doorway. The hall remains at the owner's saved position and scale (1.3), with the same fixed frame.

The original exterior pixels supply the permanent lower layer in every state. A shared seam divides the floor/foundation from the fading upper facade; no animated resizing or interpolation of the building geometry occurs. The camp wall is clipped from the actual room envelope in both states, avoiding a wall-mask pop during entry. Furniture fades with the reveal and sits on the shallower floor; the planning table and chest have clear approaches. The back collision line follows the new rear wall's ground contact.

The interior migration is versioned and idempotent. It preserves owner-adjusted furniture from the earlier refit and all unrelated placements. Continued runs retain progress and inventory; a survivor saved on the obsolete upper floor is returned to the clear center of the room.

## Artwork

Built-in ImageGen edits, stored at:

- `public/survival/headquarters-south-v1/cutaway-v3.webp`
- `public/survival/headquarters-south-v1/ruined-cutaway-v3.webp`

Original exterior and earlier cutaways remain in source history. These are transparent 1536 × 1024 assets with WebP quality 92 and full-quality alpha, bundled for offline native use. Exterior foundation pixels are retained directly by the renderer rather than relying on generated alignment.

Prompt set (built-in tool, precise-object-edit):

1. Edit the exact south-facing ruined headquarters exterior. Remove roof, chimney, tall front window panels and lintel while preserving the same canvas, scale, perspective, footprint, original central stone stairs, foundation, left crates/sacks and right milk churn/log store. Reveal a modest shallow dark timber room, damaged rear boards and clear center; no furniture or people; transparent background.
2. Edit that roofless result. Remove the two tall doorway posts down to low stumps, remove front fallen planks, and shift the rear wall upward about 80 pixels to give a moderately deeper floor. Preserve all lower foundation and foreground object positions, warm dark timber texture, detailed painted pixel-art style and transparency.
3. Produce the repaired version of the accepted ruined cutaway. Keep every wall, edge, stump, exterior prop, stone and stair at the same position and scale. Repair holes and tidy scattered broken planks only; retain aged timber/moss, roofless silhouette, camera and transparency.

## Validation

- Root and native TypeScript checks.
- Production native renderer via CanvasKit, fully offline, repaired and ruined states at ten positions across entry.
- Fixed-camera inspection of outside, intermediate and indoor frames.
- Pixel equality of the original lower foundation at nine transition stages.
- Continuous reveal checks at 61 positions, including rotated and flipped halls; solid outside and fully absent indoors.
- Entrance, four standing positions, 64-unit center aisle, chest and planning-table access/navigation checks.
- Saved-run migration, owner-furniture preservation, inventory/progression preservation and idempotence.
- On-site repair and HQ raid regression checks.
- Production web build and deploy archive parity.

Evidence: `docs/qa/headquarters-transition-v3/`. No physical iPhone test was performed.
