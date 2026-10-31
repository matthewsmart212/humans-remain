# Headquarters final polish

Implements the approved Camp, Plans, Workshop, equipment and Journal refinements using the existing game asset registry. No generated mockup artwork is shipped.

- Camp uses a shorter level strip, a larger headquarters illustration and one repair row listing only damaged conditions. Short landscape screens place the title and repair row beside the illustration, which can shrink to fit the available height. Upgrade costs remain on the left, with an explicit backpack and camp stores hint and an “Upgrade to Level 2” action.
- Current-level headings read “Available”; future levels read “Unlocks”. Locked illustrations use half the previous blur, a lighter dim and mild web desaturation. Labels, lock badges and preview actions stay sharp.
- Plans show all accessible level-one plans before level-two previews. Ordinary cards use quieter outlines without corner studs. Equipment identifies its crafting station. The smaller level dropdown shows the selected option, and both pagers place the page number between the arrows. Returning from a detail preserves catalogue filters and page.
- Workshop details link to the actual wooden axe, pickaxe and knife recipes under “Made here”. Map actions explicitly say “Mark … on map”. Missing costs say “Need N more”.
- The Journal replaces binary counters with one completion summary. Both its next action and tracked HUD resolve the camp-level prerequisite before the furnace. Once a furnace is built, the smelting step can mark it on the map. Compact layouts retain all three checklist rows and pinned actions.

## Resource rules

Existing rules are unchanged: Camp level 2 costs 8 logs and 4 stone. Counts combine backpack and shared camp stores; the backpack is spent first. The complete cost is validated before any deduction, and the upgrade can only be paid once. Camp access unlocks plans; construction and crafting still require their own costs and facilities. Levels 3 and 4 remain unavailable previews.

## Validation

- TypeScript check and the headquarters regression script pass, including new mixed backpack/storage payment, insufficient-cost atomicity, catalogue order and Journal prerequisite checks.
- Browser inspection at 844×390 covered Camp, Plans, Workshop recipe navigation, wooden axe cost details, locked previews, filter selection, page restoration and Journal-to-upgrade routing. All three Journal rows were visible after compact spacing adjustment.
- The 756×354 damaged starter camp was inspected before the final title/art side-by-side adjustment. Browser automation then became unavailable; that final compact arrangement and portrait/desktop layouts could not be visually rechecked in this pass. No physical native device test was performed.
- Web and offline native asset resolution remains covered by the regression script.
