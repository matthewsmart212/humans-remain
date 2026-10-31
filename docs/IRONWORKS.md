# Camp ironworks

Mining and scavenging now lead to the same usable crafting metal: iron ingots. The game retains the existing painted woodland style, shared inventory, camp storage, tool controls and round-based state.

![Furnace menu](qa/ironworks-v1/furnace-menu.jpg)

## Resource loop

| Source | Yield | Requirement |
| --- | --- | --- |
| Ordinary boulder | Existing stone yield plus a 25% chance of 1 bonus iron ore | Wooden or metal pickaxe |
| Iron-veined boulder | 2 stone and 3 iron ore, guaranteed | Metal pickaxe; 4 hits |
| Scattered salvage | 2–4 scrap per pile; 64 procedural piles instead of 160 | Collect while exploring |
| Defeated robots in the survival world | 1–2 scrap | Combat |
| Ore furnace recipe | 2 iron ore → 1 iron ingot in 20 seconds | Log heat |
| Scrap furnace recipe | 3 scrap → 1 iron ingot in 16 seconds | Log heat |

The ordinary ore roll is fixed per boulder per run, independent of hit count, serial allocations and pickaxe tier. Stone is never replaced by ore. New runs restore nodes; owner edits to the authored world remain separate from mining state.

## Furnace

One furnace is placed on clear camp ground near the workshop, with ten additional iron deposits around the wider world. Additions run once on web and native, remain editable, fit the placement limit, preserve existing objects and respect later owner removals.

Approach the furnace and use its action prompt. Smelting uses backpack materials first, then shared camp stores. Equipment crafting is at the smithy in the open-front workshop next door. One log provides 60 seconds of active smelting heat. Heat is banked while idle or when the output tray is full. Four batches can queue; eight ingots fit in the tray. Finished ingots stay there until collected, including when the backpack is full. Cancelling a batch returns its ingredients to camp stores without refunding spent heat.

The shared game clock continues smelting while exploring or travelling through an interior. Pausing gameplay does not advance the clock. Multiple placed furnaces maintain independent queues and output trays.

The bellows upgrade costs **8 stone + 2 iron ingots + 2 logs**. It reduces batch duration by 20%, increases the queue to six, the output tray to twelve, and heat capacity from 180 to 240 seconds.

## Smithy and equipment recipes

Approach the front of the workshop beside the furnace and use **Craft**. Tools, Weapons, and Bow & arrows categories show the existing gear artwork, damage, weight, owned gear, ingredient costs, and backpack capacity. Costs remain visible above the craft button on small screens. Each press crafts one item, or ten arrows. The station requires a clear approach and closes when the player leaves, enters combat, or is downed. Buildings, chests, and stations do not receive resource discovery outlines; collectible materials, ripe plants, mineable rocks, and axe-targeted trees retain their nearby outlines.

| Output | Cost |
| --- | --- |
| Wooden pickaxe | 3 logs |
| Metal pickaxe | 2 iron ingots + 2 logs |
| Wooden axe | 2 logs |
| Camp axe | 2 iron ingots + 2 logs |
| Wooden knife | 1 log |
| Scrap knife | 1 iron ingot + 1 log |
| Wooden spear | 2 logs |
| Metal spear | 2 iron ingots + 2 logs |
| Wooden sword | 3 logs |
| Metal sword | 3 iron ingots + 1 log |
| Makeshift bow | 4 logs |
| 10 arrows | 1 iron ingot + 1 log |

Crafted equipment goes into the backpack. Carry-capacity checks account for materials consumed from that backpack before adding the output. Existing held equipment is preserved.

## Art and mockup

The built-in image generation tool produced four transparent sprites using the existing workshop, rock and scrap art as references:

- `public/survival/ironworks-v1/iron-ore.png`
- `public/survival/ironworks-v1/iron-ingot.png`
- `public/survival/ironworks-v1/camp-furnace.png`
- `public/survival/ironworks-v1/iron-boulder.png`

Exact prompts and references: [prompts.json](../art-source/equipment/ironworks-v1/prompts.json). The menu mockup above is the implemented interface, captured from the real game renderer. Cold, burning and ready states use the same furnace sprite, with the approved campfire’s eight painted flame frames clipped inside its opening, plus ingot layers to preserve alignment. Reduced motion holds steady heat rather than animated flames.

## Checks

- Root TypeScript and production build passed.
- The production bundle excludes the unused predator artwork download ZIP; all individually loaded sprites remain available. This keeps the expanded build below the host's 256 MiB limit.
- `check-ironworks.mjs`: passed. Includes 10,000 ore samples (2,531 bonuses), fixed per-node rolls, tool gates, both recipes, fuel, full and cold pauses, long frames, cancellation, output capacity, upgrades, access locks, storage, interior clock, map preservation and reachable stations/deposits.
- `check-smithy.mjs`: passed. Covers all twelve recipes, exact pack-first/shared-store payments, no losses on missing materials or full backpacks, net weight, combat/range/interior/transform access, real authored-camp docking, contextual action, and smelt → collect → craft → equip.
- `check-resource-outlines.mjs`: passed, including nearby and selected buildings/stations never receiving a resource glow.
- `check-ironworks-renderer.mjs`: passed using the actual CanvasKit/shared rendering adapter. Covers cold/burning/ready furnace states, moving and reduced-motion embers, light, cracked deposits and rubble.
- Existing mining, foraging and web/native quick-selector checks passed.
- Native furnace, HUD and inventory modules bundle with all local image/font references resolved. A full Expo build and physical iPhone run remain unverified because Expo dependencies are unavailable here.
- Browser exercise completed ore and scrap smelting, ingot collection, metal pickaxe crafting and the bellows upgrade. Iron deposits show a disabled action with the wooden pickaxe.

Local development exercises: `/scripts/ironworks-preview.html` and `/scripts/ironworks-device.html`. Normal production builds exclude these test pages and their fixture supplies.

The furnace fire reuses the live campfire artwork uploaded on 10 October 2026 (base_hearth_t1, revision 2), at its existing 10 fps. Only the flame region above the logs is sampled; stonework clips the result. Reduced motion holds frame zero, and cold/idle furnaces show no flame. Two unchanged source frames are retained under `scripts/fixtures/furnace-fire` for offline CanvasKit checks. The rendered result is shown in `docs/qa/ironworks-v1/painted-furnace-fire.png`.
