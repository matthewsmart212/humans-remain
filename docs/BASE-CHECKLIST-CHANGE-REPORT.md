# Checklist migration · 6 October 2026

## Retained and renamed

All 256 existing IDs, 24 image links, crop coordinates, evidence notes and art/implementation/test defaults remain. The frozen catalogue and live-mark snapshot are in `docs/archive/`. Display names now use consistent industrial language, including **Reinforced stone-and-brick hearth**, **Reinforced masonry wall**, **Electric lamp**, **Equipped camp kitchen** and **Powered pump house**. The masonry wall uses reclaimed brick/stone and steel, without battlements. Existing tests remain labelled as previously reported, not newly rerun gameplay QA.

## Consolidated and reclassified

- Basic campfire cooking is an integrated capability of the hearth. Its old ID survives and it uses one fire/fuel account. Dedicated cooking starts with spit-and-pot and has three independent tiers.
- Bedroll and cot gameplay references link to canonical reusable furniture art; medicine preparation is a medical attachment. Specialist repair and processing entries are optional workshop modules before any larger specialist building is justified.
- Timber/construction/fuel stores and drop-off entries link to one shared inventory. Loose logs/stone remain distinct from storage. Basket, trolley, cart and functional wheelbarrow are equipment rather than a forced upgrade chain.
- Map/planning concepts link to one Camp Planning Board. A broken radio is a discovery/restore state; the functioning radio has three displayed tiers. Monuments are cosmetic milestones.
- Terrain, existing ruins, industrial fixtures and natural objects live in world/environment art. Each existing machine has a stated actual role. None was blindly promoted to a three-tier build chain.

## Added and moved

Twenty explicit linked requirements were added: clean buildable terrain, planning board, modular walls/gates, seeds, crop states/produce, medical supplies, stock displays, proper bed, pickup icons, UI feedback, shared construction effects, seed and medical supply sources, hauling behaviour, wall/gate collision, co-op ownership, two-client proof and interaction acceptance. No prior ID was deleted. Tier-four core entries now sit beside tiers one through three in their families, even when scheduled for B4. First-night walls and gate moved from old B5 to B1; basic farming moved from old B4 to B2; advanced utility tiers remain B4. Optional animal, weather, contamination, trade and rescue features are B5 and carry gameplay blockers.

## Unresolved design decisions

Construction costs, exact capacities, recipe lists, milestone unlocks, power loads and weather/contamination effects are deliberately **undecided**. Original collision dimensions are proposed and must be verified against the worker hitbox. The B0 placement decision must define supported wall orientations and gate geometry before final modular exports. A raised tank's fill method is independent of electricity; basic water, cooking and lights remain available when power fails. Shelter provides rest without a new fatigue meter; medical care consumes obtainable supplies.

## First artwork commission

The first concrete B1 brief is the **medical-supply search/pickup/inventory kit**, using the existing industrial art and worker scale. Its gameplay source and use are stated, and it does not depend on final building geometry. Next, commission the starter gate/wall module sprites only after B0 locks the measured opening, straight/corner/end placement rules, ground anchor and supported orientations. The clean terrain task starts with a separation audit of existing scenery, not a repaint or a replacement of the currently running map.

All further artwork waits for the relevant state and functional decisions. The migration itself did not generate images or change game logic.
