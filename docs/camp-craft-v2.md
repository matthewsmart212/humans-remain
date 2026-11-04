# Compact camp furnace and corner warehouse

Implements the approved compact corner-store option beside the east stone path,
with one joined roof and inward-facing storage bays. The stone furnace uses the
matching timber bellows shelter. Weathered wood, patched metal, moss, alpha edges
and ground contact match the existing camp palette.

The stable building and placement IDs preserve inventory, repairs and furnace
jobs. Worksite migration 3 updates the known authored placements and ground
footprints once; custom positions, rotations, scales and removed buildings stay
intact. The snapshot preserves the latest authored camp, including the workshop move.
Newer Site worksite code was reconciled into GitHub without deleting existing
assets. Earlier artwork and editor reports remain in their original Site source.

- Wood, stone and metal each have empty, partial and full visual states. Shared
  clipped bays show complete stock objects and leave roof/structure unchanged.
- The firebox is cold when idle. Existing animated fire, reduced-motion support,
  furnace light and finished ingots use the new opening and ledge.
- Damaged building art matches the new footprints. Native offline bundles,
  restoration art, catalogue metadata and furnace menu images use the new assets.
- PNG originals remain in `art-source/camp-craft-v2`; reproduce bounded WebP
  exports with `node scripts/package-camp-craft-v2.mjs`.

Validation: web and native TypeScript; 27 warehouse stock combinations and
storage transfer/access checks; real CanvasKit furnace animation and lighting;
restoration/save compatibility; production native renderer offline checks for
both approaches and repaired/partial/active/ruined states. Renderer captures are
under `docs/qa/camp-craft-v2`. No physical iPhone run was performed.

The standalone Vite browser preview has no Worker API backend, so its startup
could not be verified there. The published build retains the existing Worker
and storage bindings.
