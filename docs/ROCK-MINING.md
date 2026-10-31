# Rock mining

Selected existing woodland and river boulders now break into stone, exclusively with wooden and metal pickaxes. The authored map stays unchanged; damage, depletion, rubble and opened collision belong to the current run. Loose pebbles and cliff/shelf scenery remain decorative.

- Both pickaxes start in the headquarters tool chest and use the existing inventory and quick selector.
- Hold Mine for repeated strikes. Damage resolves at contact and only once per swing. Frontal aim assistance helps with eight-direction controls.
- Wooden pickaxe: 20 rock damage, 1.3 kg. Metal pickaxe: 40 rock damage, 2.1 kg. Neither costs stamina.
- Boulders contain 80–120 strength and drop 3–5 stone. The common 100-strength boulder takes five wooden strikes or three metal strikes.
- Nearby nodes display Mine, Move closer, or Pickaxe required. Damage adds cracks and stone chips; depletion leaves small rubble.
- Stone weighs 0.75 kg each. Collect, drop, store and withdraw it through the current systems; a full pack leaves the remainder on the ground.
- Stone now also supports the camp furnace bellows upgrade. Mining includes bonus ore and marked iron deposits; see [IRONWORKS.md](IRONWORKS.md) for the current smelting and crafting loop.

## Artwork

Both assets were made with the built-in image generation tool, using the existing wooden axe only as a style reference. Original transparency is preserved.

- `public/survival/equipment/wooden-pickaxe-v1.png`
- `public/survival/equipment/metal-pickaxe-v1.png`
- Stone reuses `public/survival/world-rocks-v1/river-stone-trio.webp`.
- Exact final prompts: [prompts.json](../art-source/equipment/mining-v1/prompts.json).

## Verification

- `node scripts/check-rock-mining.mjs`: passed. All 224 existing selected boulders have a sampled clear approach; verified tool exclusivity, tiers, timing, single drops, draft isolation, collision, cover, transforms, partial capacity and chest transfers.
- Root TypeScript check and production build: passed.
- Existing foraging, bow lock and web/native quick-selector checks: passed.
- Native HUD, inventory and quickbar bundle check: passed, including resolution of local artwork and font files.
- Browser play test: wooden hit reduced a boulder from 100 to 80; two metal hits reduced it to zero; rubble and four stone appeared; collecting placed four stone in the backpack alongside both tools.
- Full Expo/native TypeScript build was unavailable because this workspace lacks the Expo dependencies and base configuration. Physical iPhone testing remains outstanding.

Development exercise: `/scripts/mining-preview.html`; normal production builds do not expose this test page.
