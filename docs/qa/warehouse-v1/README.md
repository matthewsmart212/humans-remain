# Warehouse storage and scrap salvage

Wood and scrap use independent empty / partly stocked / well stocked stages (wood: 0 / 1–19 / 20+; scrap: 0 / 1–49 / 50+). Thresholds are visual only, not storage caps. The ledger is shared with camp storage and fire fuel. Native and web menus support quantity selection, deposit all, and capacity-limited withdrawals.

160 collectible scrap piles per new outdoor play session, randomized with a spacing and clear-approach check; water, obstacles and interiors are excluded. Three visual variants yield 4–8 scrap each. Collected piles disappear. Existing editor placements are unchanged.

## Generated art

- `public/survival/warehouse-storage-v1/empty.webp`
- `public/survival/warehouse-storage-v1/half.webp`
- Existing full warehouse: `public/survival/camp-structures-v3/warehouse.webp`
- `public/survival/scrap-salvage-v1/{pipes,sheet,machine}.webp`

Imagegen modes: precise-object-edit for warehouse stages; stylized-concept for scrap. Transparent backgrounds. Original full warehouse supplied as visual reference, then generated empty used for half-stocked edit.

Prompts: Empty — preserve the original roof, beams, bin walls, moss, perspective and canvas; remove all logs and loose scrap to reveal plank floors and back walls. Half — preserve the empty structure; add five low-stacked logs in the left bay and three short rusty pipes plus a bracket in the lower half of the metal bin. Scrap — three separated small piles in a horizontal row: pipes with bracket, corrugated sheet with gear and bolts, broken housing with bars and coil; warm rust orange, grey silver chips, dark brown outlines, painterly elevated three-quarter top-down view; no crate, ground, text or background.

Only bay interiors are composited into the original full shell, avoiding structural drift between states. See `nine-storage-states.png` for all nine combinations.

## Validation

`node scripts/check-warehouse.mjs`: real authored warehouse interaction and dock collision, exact quantity transfers and count conservation, negative/NaN rejection, capacity limits, distance/downed protection, independent fill stages, 160 unique randomized placements, collection/removal and nine rendered states.

`node scripts/check-chest-ui.mjs`: existing web/native storage regression passes. `npm run typecheck`: passes. Native WarehousePanel bundled successfully; no physical native device available. Browser verified deposit/withdraw and responsive menu at desktop and phone sizes using `scripts/warehouse-qa.html`.
