# Headquarters surface and unlock polish

Requested on 29 October 2026:

- Reuse the existing station-menu green gradient, radial light and fine grain.
  Cards and selected states use the backpack's matching surface colours.
- Keep camp upgrade costs and the action in the left parchment panel, alongside
  the current-to-next level transition. Compact material chips retain the real
  owned/required quantities. The button retains its 44-point touch target.
- Use the right panel for the complete level unlock catalogue: nine cards on
  normal landscape layouts; six per page in shorter landscape or portrait.
  Additional items remain accessible with explicit page controls.
- Soften locked artwork using a 2-pixel blur and reduced opacity. Small lock
  badges, names, requirements and actions remain sharp. This applies to the
  camp unlock grid, the Plans catalogue and locked detail previews. It clears
  immediately when the relevant camp level is unlocked.
- Dismiss temporary feedback after 3.2 seconds so it does not keep consuming
  space in the unlock grid.

The resource costs, payments, saved progression and construction rules are
unchanged. The shared native component receives the same layout and image blur;
web gradients reuse the station CSS and native retains its station palette.

## Verification

The existing headquarters model checks and TypeScript check pass. Browser QA
used the actual component with the isolated development fixture at 1280×590,
844×390, 756×354 and 390×844:

- Checked all nine previews, shorter-screen pagination and portrait scrolling.
- Verified that missing stone disables upgrading and leaves costs visible.
- Upgraded using 12 logs and 8 stone: the subsequent furnace details correctly
  show 4 logs and 4 stone remaining.
- Observed artwork filters change from blur(2px) to none after upgrading.
- Checked locked versus available Plans cards, full locked details, return to
  camp, Journal surfaces and label/button contrast.

No physical iPhone / Expo session was used for this pass.
