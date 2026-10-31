# Headquarters menu

The planning bench now opens a full-screen camp menu based on the approved green, brass and parchment mock-ups. Web and native use the same React Native content component so the structure, data and actions stay aligned. The web modal is portalled to the document body to isolate its controls from the editor’s generic button styles.

## Player experience

- **Camp:** select an illustrated building, inspect its current state and browse its plans. The centre contains the bonfire; the vegetable patch is under treatment. The diagram uses current building assets and does not move world placements.
- **Blueprints:** browse buildings, tools, weapons, food/medicine and defences. Found plans can be learned at headquarters. Actual building work remains at the appropriate station.
- **Equipment:** inspect existing workshop recipes, materials and backpack/storage counts. Crafting still happens at the workshop.
- **Discoveries:** records only discoveries the current expedition has made.

The garden's broken, ground-bed, raised-bed and greenhouse artwork is browsable. Garden planting/repairs and medical treatment remain explicitly labelled design previews, without material charges or inactive unlock buttons.

## Existing gameplay connections

Recovering the furnace bellows reveals metalworking; studying it at the bench enables the existing furnace repair. Crafting a metal weapon reveals the reinforcement plan; studying that plan enables the existing paid camp reinforcement. These are the two persisted learned plans in this version. No research-point currency or broader building gates were added.

Existing restored-furnace and fortified saves infer their learned plans, preserving access. The optional blueprint field travels with the shared expedition state, including bunker travel and reloads; invalid saved IDs are rejected.

The daytime objective card, forced progression waypoints and three-night completion announcement have been removed. The camp-attack warning remains during raids. Map markers are set only when the player asks to show a building or the attacked camp.

## Validation

- Web and native TypeScript checks.
- `node scripts/check-headquarters.mjs`: found/learned guards, idempotent learning, atomic repair gating, legacy saves, invalid saves, bunker travel/reload, read-only browsing, optional navigation, web and offline-native artwork.
- `node scripts/check-first-expedition.mjs`: the existing survival, furnace, crafting, repair, raid and save regression suite, updated for voluntary blueprint study.
- iOS Expo export; no physical-device test was available.
- Browser checks of the actual shared component at 1180×650, 844×390, 667×320 and 390×700; tabs, plan catalogue, garden tiers, recipe locks, discovery journal and learn-state updates.

`scripts/headquarters-preview.html` is a development-only viewport fixture with isolated expedition states and the production editor styles. It is not included in the production application build and never writes the authored map or the player's saved expedition. Screenshots and automated reports are in `docs/qa/headquarters-menu-v1`.
