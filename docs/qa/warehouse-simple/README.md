# Simplified warehouse inventory

Checked on 2026-10-31.

The warehouse now reuses the backpack inventory components: Warehouse / Backpack source tabs, three material slots, one selected-item summary, and one/all transfer actions. Zero-count slots remain visible and selected. The bulk withdrawal button shows the amount that fits when backpack capacity is limiting.

![Warehouse menu with stone selected](warehouse-menu-1793469932139.jpg)

The screenshot uses the actual game HUD, warehouse component, renderer, artwork, and exported world snapshot in a local test fixture. Inventory amounts are controlled test data; these interactions did not modify a live save.

## Verification

- Web `npm run typecheck` passed.
- Native `npm run typecheck` passed from `native/`.
- Production build passed through the official Sites build helper.
- `node scripts/check-warehouse.mjs` passed its storage conservation, capacity, invalid quantity, range, downed-player, and rendering checks.
- Browser checks covered 844 × 390, 768 × 354, 667 × 375, and 320 × 568 viewports. Transfer actions remained visible and at least 44 pixels tall.
- Taking one log changed Backpack / Warehouse from 6 / 12 to 7 / 11. The capacity-limited bulk action then took 6, leaving 13 / 5 and correctly disabling further wood withdrawal. Storing the stack returned the balances to 0 / 18 without changing the selected material.
- Storing one stone changed 2 / 4 to 1 / 5; the source badge displayed 1 and the redundant bulk action disabled.
- Switching source tabs showed the correct inventory counts. Empty stacks displayed zero and disabled transfer actions.
- The ordinary backpack still displayed its item grid, equipment state, item information, and normal actions.
- Code review confirmed that both web and native continue to use the existing transfer validation and that new shared component options preserve other inventory callers' defaults.

Native layout was checked in source and with TypeScript; it was not run on an iOS simulator or physical device in this session.

The previous warehouse stock caption, repair-message priority, larger main/quick buttons, and secondary-button spacing are retained.
