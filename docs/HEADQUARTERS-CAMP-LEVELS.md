# Headquarters and camp access

The headquarters interface is shared by web and native. Camp, Plans and Journal replace the separate equipment and blueprint catalogues. Existing illustrations remain real assets; all names, requirements and buttons are live controls.

## Progression

- New Survival expeditions start at Camp 1 (Makeshift camp).
- Expanding headquarters opens Camp 2 (Working camp). It requires an open, nearby headquarters, a living and non-downed survivor, daytime, the authored workshop and warehouse, 8 logs and 4 stone.
- Workshop and warehouse presence means readiness: neither has an invented repair flag.
- Payment uses the existing atomic backpack-first/shared-store helper. Expansion can only be paid once and never creates equipment, repairs the furnace, learns a blueprint or adds a waypoint.
- Bellows and smelting notes may still be discovered at Camp 1. Camp 2 enables studying their blueprint. The player then restores the furnace at the actual building, smelts ingots, and crafts equipment at the workshop.
- Existing furnace restoration and all forge recipes retain their real ingredients and costs. Equipment recipes follow existing furnace access; they do not acquire pretend discovery or learning flags.
- Further camp levels are not exposed without a functioning capability to unlock. Garden and treatment remain clearly labelled, non-payable artwork previews.

## Saves

The additive `campLevel` field retains the existing save version and key. Old runs retain previously found metalworking access, learned blueprints, restored facilities, metal-crafted progress and reinforcement. Existing working facilities establish Camp 2 as a minimum even if another field is inconsistent. Unknown or malformed level values reject during decode. Scene travel already shares progression, including camp level.

## Interface

Plans are grouped by camp level and filtered by category. Building families appear once; their named stages are browsed in the inspector. Materials and the main action remain together. Missing requirements open the relevant camp inspector or access page. Inspecting in camp closes headquarters; it does not teleport the survivor or create a waypoint. Portrait plan browsing restores the list position when returning from a detail page.

## Verification

- `npm run typecheck`
- `npm --prefix native run typecheck`
- `node scripts/check-camp-levels.mjs`
- `node scripts/check-headquarters.mjs`
- `node scripts/check-first-expedition.mjs`
- `node scripts/check-smithy.mjs`
- Production web build via the Sites build helper.
- Local iOS export with `EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 npm --prefix native run export:ios`.

The local shared-component browser fixture was checked at landscape and portrait phone dimensions. Actual button presses verified expansion, exact store deduction, plan learning without further payment, prerequisite navigation and the catalogue. Automated simulations cover the furnace-to-smelting-to-crafting chain, old-save access and bunker reloads. Physical iPhone testing and an Xcode signed device build remain unverified.
