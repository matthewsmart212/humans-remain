# Headquarters progression menus

The approved 29 October design is implemented by the shared web/native
HeadquartersContent component using the existing game artwork.

- Camp opens directly on the next upgrade: unlocks, owned/required resources,
  missing quantities and one upgrade action. Level 1 and 2 can be inspected.
  Levels 3 and 4 are visibly marked Soon and cannot take resources.
- Plans use the full width with six cards per page, All/Buildings/Equipment
  filters and a camp-level selector. Selection opens a separate detail view;
  returning keeps the filter and page. Portrait uses vertical cards.
- The journal provides optional checklists and one persistent tracked objective.
  Discoveries remain available in the same journal. Explicitly tracking an
  objective enables a small daytime HUD reminder with an optional map link.
  The raid warning takes precedence at night.

## Progression

The existing costs remain unchanged: Camp 2 costs 8 logs and 4 stone; the
furnace costs 4 logs, 3 stone and 4 scrap. Payments use the existing atomic
backpack-plus-camp material system.

Camp 2 grants ordinary recipe knowledge automatically. Furnace bellows and
notes remain an optional exploration discovery. There is no separate learning
payment or required cache trip. The furnace can be built from its HQ plan at
the authored site. It must actually be built before metal equipment can be
crafted at the workshop. Building twice cannot charge materials twice.

HQ construction requires an open nearby headquarters, a living survivor,
daytime, the existing furnace site and the complete cost. It does not move the
player or change the authored layout. Individual furnace upgrades still happen
at the furnace. Find actions mark a waypoint only when explicitly selected.

Journal tracking and the real smelting/pickaxe milestones are saved with the
expedition and shared through scene travel. Legacy saves retain their access.

## Verification

- Production build and TypeScript check passed.
- check-camp-levels, check-headquarters and check-first-expedition passed.
- Browser checks used the production component with an isolated fixture at
  844×390, 756×354, 390×844 and 1280×590.
- Verified missing-resource disabling, level upgrade, exact remaining resources,
  direct furnace construction, automatic journal completion, tracking, level
  filters, pagination, detail navigation and portrait layout.
- No physical iPhone / Expo device session was used.

The development fixture is not included in the production entrypoint.
