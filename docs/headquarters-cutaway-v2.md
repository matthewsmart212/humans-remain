# Headquarters visibility and furnishing

Uses the owner's saved editor revision 85: headquarters at
(1718.0886173042022, 333.4056711136809), scale 1.3. Its position, frame,
rotation, collision and the perimeter placements remain unchanged.
The native world snapshot now includes this latest saved draft.

The complete aligned exterior replaces the old rectangular roof crop outside.
On the central stairs or inside, the exterior pass is omitted entirely. The
new interior assets have no south facade, windows, doorway posts or lintel;
the low foundation, steps, rear wall and side walls remain. Interior furniture
is hidden from outside so tall props cannot protrude through the roof outline.

A cached room envelope clips only overlapping palisade pixels while the
interior is visible, using native Skia difference clipping or Canvas even-odd
clipping. This does not alter any wall artwork, placements or collision.

A one-time `headquartersInteriorVersion` refits the six existing authored
furniture placements to the owner's current hall, with scales proportional to
the hall. It preserves IDs, inventory and later furniture edits. Existing runs
receive the same refit without resetting their progress. The planning-table
interaction point keeps a minimum 32 world units of clearance when scaled down.

## Artwork

Built-in ImageGen edited the original repaired/broken interior sprites into
`public/survival/headquarters-south-v1/cutaway.webp` and
`public/survival/headquarters-south-v1/ruined-cutaway.webp`.
Both are transparent 1536 x 1024 and included in the native offline bundle.
The original interior and exterior sprites remain in source.

Prompt set: preserve exact canvas, south-facing orientation, rear/side walls,
plank floor perspective, foundation and central staircase. Remove both front
window panels, tall doorway posts, lintel and exterior front props. Extend
matching floor through their former positions, ending at a low mossy stone
foundation lip. Keep an empty room for separately interactive furniture, no
roof/chimney, characters, terrain, text or background. The broken variant
retains damaged rear/side walls and edge debris. Preserve transparent alpha.

## Validation

- Root and native TypeScript checks.
- `node scripts/check-south-headquarters.mjs`: retained owner placement,
  one-time migration, later edits, save/inventory preservation, four clear
  standing positions, a 64-unit centre aisle, entrance/table navigation,
  accessible chest, mask pixels and offline artwork.
- `node scripts/check-headquarters-native.mjs`: four actual native-renderer
  frames through CanvasKit with file-backed Expo asset shims, fully offline.
- `node scripts/check-on-site-repairs.mjs`: repairs, costs, save reloads,
  starter-tool migrations and robot routes/attacks on the resized table.
  Direction expectations now follow the actual table position; stair checks
  verify that the exterior pass is absent instead of 8% opaque.
- Matching production web build through the Sites publishing helper.

Evidence is in `docs/qa/headquarters-cutaway-v2/`. These checks do not certify
physical-device GPU performance; no physical iPhone test was performed.
