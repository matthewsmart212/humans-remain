# Patch letter and companion UI

Run `node scripts/check-patch-ui.mjs` from the repository root.

The check renders the actual React components and bundles the CSS reachable from
`src/main.tsx`, including the editor styles that caused the original letter bug.
It applies the matching author rules, specificity, inherited custom properties,
and phone media/container conditions to the rendered markup. This is a focused
cascade check; it is not a browser layout or paint engine.

Covered behavior:

- The approved note is rendered verbatim, including the P-04 signature.
- The camp supplies retain the note after every inventory reward is collected.
- Reading adds no inventory weight, and the note is unique to the camp chest.
- Back returns to nearby supplies and closes when the player is out of range.
- The header uses a folded-page emblem; other station menus retain their art.
- Every letter paragraph and the actual signature/provenance text has at least
  7:1 contrast against the opaque paper background. Current body contrast is
  10.03:1; the lowest text contrast is 7.72:1.
- Safari text-fill agrees with paragraph ink. Paragraphs remain at least 16px;
  the paper scrolls vertically, can shrink, and remains keyboard reachable.
- Back has a 44px touch target. Shared safe-area geometry and text width are
  checked at 390×724, 844×390, 844×300, 667×290, and 320×568.
- Removing the explicit paragraph ink reproduces the original pale-text failure,
  demonstrating that the check detects the reported regression.
- Invitation and command stages remain distinct. Follow has its own row, Stay
  and Return share the second row, and one current instruction is indicated.

The `note-*-static-proof.png` images and `letter-cascade-verification.json` are
one-off WeasyPrint style proofs made from actual React markup and bundled game
CSS. They confirm the paper/ink appearance; **they are not browser or phone
screenshots**. That print renderer does not reproduce Safari scrolling,
responsive screen/container rules, or all CSS transforms. In particular, its
close mark appears as a diamond. The proofs predate the final change from a
40px to a 44px Back touch target. Companion layout is excluded from these print
proofs because that renderer did not reproduce its CSS grid correctly.

Browser/device QA must still verify the actual paint, full-letter scrolling,
touch actions, command grid, and Safari toolbar changes. Native TypeScript
validation covers the mirrored native implementation; it is not a simulator
or device interaction test.
