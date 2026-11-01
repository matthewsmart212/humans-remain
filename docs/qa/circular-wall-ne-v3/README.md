# Northeast saved-layout repair

## What failed in Site version 327

The corrected wall artwork was aligned with the painted road, but the migration examined the two northeast wall sections independently. It required exact original coordinates and settings, then recorded perimeter version 6 even when one section was skipped.

The captured live draft (revision 80) contained corrected section 02 beside legacy section 03. Section 03 had been unlocked and moved by (-5.771149033311303, +4.109959723949828) world units. New 02 ends at 47 degrees while legacy 03 starts at 47.149 degrees, leaving overlapping posts across the road. The earlier verification used canonical placements and did not cover this mixed saved state.

## Repair

Perimeter version 7 reconciles both northeast sections together for version 5 and 6 worlds. It carries small translations (at most 16 world units, measured as a Euclidean distance) into the corresponding corrected anchors and retains all other placement settings. The exact revision-80 repair changes only section 03; its unlocked state and 7.085-unit position adjustment survive. The other 4,547 placements are preserved.

A missing section, a larger move, rotation, scale, flip, fixed frame, or custom collision/footprint defers the pair as a whole. A deferred correction leaves the old version marker and data unchanged. This prevents future half-updated pairs and protects substantial owner edits.

The 47–57 degree gap and all artwork bytes remain those verified for version 327. No image generation, colour change, or road repainting is part of this repair.

## Evidence

- `revision80-ne-placements.json`: minimal capture of the actual mixed pair and hearth.
- `layout-verification.json`: exact revision-80 regression, atomic old/mixed pairs, bounded adjustments, idempotence, custom-edit/deletion preservation, all 777 road probes and six entrance routes.
- `runtime-verification.json`: continuing the mixed version-6 saved run opens the road while preserving resources, health, time, progress and all unrelated placements.
- `server-verification.json`: versions 4/5/6/7 round-trip without changing placements, version 8 is rejected, and stale writes remain rejected.
- `nudge-clearance.json`: independent collider and route analysis. The actual saved pair blocks 49 of 102 northeast samples before repair and none afterward; all 777 samples are clear after repair. The 16-unit translation allowance fits inside the measured clearance margin.
- `typecheck.json`: TypeScript passes.
- `before-live-draft.png`, `after-live-draft.png`, and their paired views: the actual revision-80 layout rendered through the production native/shared game renderer at the user screenshot's framing.
- `live-draft-render-difference.json`: changed pixels are confined to the affected wall region.

The renderer proof retains all 4,548 authored placements, including the actual headquarters, well, rocks and foliage. React HUD overlays and random expedition loot/wildlife are omitted because the capture is an authored-world draft, not the player's complete private expedition save. It is an offline CanvasKit verification of the shared renderer, not a physical-device test.

The native bundled snapshot now accepts perimeter version 7. Its original level placements and all image registrations are preserved. Publishing preserves the existing Site identity, audience and storage bindings.
