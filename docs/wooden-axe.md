# Tree harvesting and round equipment

Every new `createWorld` / `createCampPlaySession` starts with an empty pack and fists selected. The headquarters chest holds one wooden axe and one camp axe, tracked per round. Supplies in other chests remain shared; axes transfer only at the headquarters storage chest. Storing an equipped axe returns the player to fists. Both tools count toward carrying weight (1.2 kg wooden, 2 kg camp).

| Tool | Tree damage, first / return | Health cost |
| --- | --- | --- |
| Fists | 8 | 1 per successful tree strike |
| Wooden axe | 20 / 24 | 0 |
| Camp axe | 40 / 48 | 0 |

Misses and felled stumps never cost health. Trees use the existing partial/stump states and drop one log bundle when felled. Axes keep the current free stamina cost, contact timing, two-cut combo and movement. Keyboard slots follow quick-bar order: 1 fists, 2 wooden axe, 3 camp axe, 4 chicken, 5 rabbit, 6 wild meat. Unowned equipment cannot be selected and is hidden in the pack and quick bar.

Wooden artwork was generated as edits of the existing upright axe and all five registered attack atlases. Attack sheets were normalized to the original 1536 × 768 layout. The original head compositor, body calibration, leg animation, carry grip coordinates and mirrored left directions are shared on web and native Skia. Native bundle registration includes all six new WebP assets.

Validation: `node scripts/check-wooden-axe.mjs`, `node scripts/check-backpack-ui.mjs`, `node scripts/check-runner-combat-head.mjs`, web and native TypeScript checks. Browser verification used the production UI components in an isolated local fixture because local preview has no hosted artwork API. All eight attack directions and both cuts were visually reviewed. No physical iPhone test was performed.
