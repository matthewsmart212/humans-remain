# Warehouse clarity and controls — 2026-10-31

## Behavior

- A healthy nearby warehouse shows its exact stored wood, stone and scrap counts next to the action control.
- Any warehouse damage suppresses the stock caption so the existing repair information keeps priority, including when the hammer is not equipped.
- Every material card shows both Backpack and Warehouse balances. Direction controls and transfer actions explicitly name the source/destination, quantity and resource.
- The selected quantity previews the resulting balances. Existing transfer validation and carrying limits are preserved.
- Main action and collapsed quick-select hexes are 20% larger. Secondary hex sizes are unchanged; their perpendicular edge gap increases from 4 to 7 pixels.
- Target captions temporarily hide while the quick selector is expanded, then return on collapse.
- Compact landscape keeps the transfer action visible. On constrained portrait screens, controls stay fixed while the inventory area can scroll.
- Web and native components share stock and geometry logic.

## Validation

Passed root and native TypeScript checks, the web production build, and these focused regression scripts:

```sh
node scripts/check-action-hex.mjs
node scripts/check-quick-selector.mjs
node scripts/check-on-site-repairs.mjs
```

The stock regressions cover exact and zero balances, stock-only refreshes, damage with/without the hammer, full repair, opening a station and leaving range. Selector checks exercise expansion, selection, disabling and unmount callbacks on web and native.

Browser checks used the actual game renderer and HUD with a controlled local world. Checked 844×390, 768×354, 390×844 and 320×568 layouts; store/take balance updates; an empty backpack; repair-priority text; selector expansion/collapse; and visible transfer controls after resizing. The final screenshots use a 768×354 local scenario. Native source was type-checked; an iPhone simulator/device rendering check was not performed in this environment.

![Warehouse menu](warehouse-menu-1793454615240.jpg)
