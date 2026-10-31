# Bracken Works — world and asset plan

## Delivery boundary

This pass builds **The Last Light home sector** around the existing solo survival simulation, worker, joystick, Skia renderer and generator interactions. The six other districts below are planned, not playable. Existing map prototypes remain in source history. Online co-op, additional resource types, healing stations, vehicles and district unlocks remain future systems; scenery does not imply those features already work.

## World structure

Target eventual footprint: roughly ten times the former four-building sector's area, assembled from separately loaded districts, not one enormous texture. Keep worker scale and camera zoom. The home sits near the world centre, slightly west of the canal, without a symmetrical four-quadrant layout.

Two overlapping loops make expeditions interesting:

- Western salvage loop: Home → Workers' Row → Scrapyard → Foundry → Home.
- Eastern supply loop: Home → Power Works → Rail Depot → Foundry, with a Waterworks tunnel returning toward Workers' Row.

The direct route is exposed; an interior route is narrower but offers loot; a repaired shortcut makes later return trips faster. Distant buildings must not require walking for an entire preparation phase. Unlock distances, travel time and day length together in playtesting. Original 90-second days remain unchanged for the small home prototype.

## 01 · The Last Light — home sector

| Building / space | Rooms and grounded contents | Gameplay / loot | Asset treatment |
|---|---|---|---|
| Repair hall | Open service bay, cracked concrete apron, tool wall, side benches, storage shelves, collapsed roof | Existing generator: deposit, refuel, repair, upgrade. West barricade, powered north shutter | Painted empty floor and fixed structure; generator, barrier and shutter separate |
| Bunkhouse | Bunks, old kitchenette, lockers, table, boots, noticeboard | Starter scrap/pallets. Later: cosmetic sleeping spaces and medical cabinet, **not a skip-night bed** | Fixed furniture painted; loot separate |
| Fuel store | Vented room, bunded floor, reserve shelving, rust stains, hose reel | Fuel pickup placed in the storage area; a short trip from safety | Floor/shelves painted; collectible cans and depletion separate |
| Salvage apron | Rail spur, welding corner, pallet rack, timber stack | Pallets and scrap; existing powered crusher beside the service lane | Rack and shelter separate sprites; moving machinery separate |
| Water tower garden | Tower, broken fence, grass and young ash trees | Navigation landmark and sheltered route, no new water mechanic yet | Tower / trees depth-sorted; undergrowth painted |
| Service yard | Forked worn road, weeds, drains, loading surfaces | Three readable approaches to defend; access between buildings | Ground painting with independent collision data |

First outing: leave the repair hall → gather fuel from the store and scrap from the yard → return and deposit → choose fuel/repair/barricade → survive night. Supplies have contextual placement, not evenly spaced rings across empty concrete. No new mandatory tutorial panels.

## 02 · Workers' Row — early supplies

| Building | Interior contents | Purpose and encounter idea |
|---|---|---|
| Canteen | Dining tables, serving hatch, commercial kitchen, pantry, refrigerator | Food and basic fuel; back pantry exits into a garden rather than a dead-end room |
| First-aid clinic | Two treatment bays, desk, locked medicine cabinet, washroom | Medical supplies; restore power to open cold storage later |
| Changing rooms | Locker aisles, showers, benches, lost-property cage | Outfits, basic tools, keys; short aisles permit flanking |
| Time office | Clocking-in machine, desk, map board, filing room | Keycard / route information; opens staff gate shortcut |
| Terraced staff cottages | Kitchens, bedrooms, small sheds and adjoining gardens | Low-value scavenging and quiet environmental stories; garden walls create alternate routes |

Visual identity: warm red brick, sagging slate, weeds in gardens, laundry lines and old staff signage. Trees and garden paths interrupt the street; not another warehouse floor.

## 03 · Scrapyard — construction materials

| Building / space | Contents | Purpose and encounter idea |
|---|---|---|
| Welding shed | Welding bench, clamps, sheet stock, gas bottle cage | Scrap and defence blueprints; noise can attract an enemy later |
| Breaker's garage | Inspection pit, suspended chassis, parts bins, tire storage | Tools and vehicle components; two exits around a blocked service bay |
| Crane yard | Gantry, sorted metal piles, crushed cars, skip bins | Large salvage objects; future powered crane opens a route rather than being decoration |
| Abandoned bus | Driver cabin, torn seats, tree through roof | Small stash landmark and narrow escape passage |
| Weighbridge office | Scale booth, records, payment safe | Keys and rare small loot; alternate gate back to Workers' Row |

Visual identity: muddy ruts, oxidised metal, blackberries, yellow crane visible above sheds. Obstacles form pockets and loops, never random unwalkable clutter.

## 04 · Foundry — high-risk machinery

| Building | Contents | Purpose and encounter idea |
|---|---|---|
| Furnace hall | Furnace banks, refractory floor, overhead crane, cooling channel | Rare generator cores; hot / powered zones create timed route choices |
| Pattern shop | Wooden forms, saw benches, timber racks | Better pallets / construction materials; rooms differ from heavy machinery halls |
| Machine shop | Lathes, mill, tool crib, service trench | Repair tools and special components; a restored machine produces an upgrade |
| Foreman's office | Overlook, safe, plans, maintenance records | Foundry key and blueprint; alternate staircase route eventually |
| Chimney service tunnel | Soot, cables, steam valves, inspection doors | Risky shortcut toward Home; darkness-based enemies fit this location |

Visual identity: huge sawtooth roofs, three chimneys, soot-black brick, amber furnace glow, young trees in roof-collapse cavities. Tall landmarks must never mask nearby combat without fading.

## 05 · Rail Depot — bulk loot

| Building / space | Contents | Purpose and encounter idea |
|---|---|---|
| Freight warehouse | Pallet aisles, dispatch desks, loading doors, overhead tracks | Bulk supplies; loading shutters alter routes |
| Parcel sorting hall | Conveyor loops, cages, offices, packing benches | Batteries and mixed loot; restore a conveyor for a moving defensive obstacle |
| Signal box | Lever frame, signal controls, battery cabinet | Opens siding gate / rail shortcut |
| Locomotive shed | Service pit, engine parts, oil store | Heavy rare engine component; later requires two carriers |
| Stranded wagons | Tanker, boxcar and flatbed interiors | Fuel / rare stock; gaps between wagons create tight choices and visible ambush lanes |

Visual identity: curved rail lines, grass between sleepers, rust-orange freight cars and faded teal loading canopies. Trucks sit at loading docks, not in arbitrary open spots.

## 06 · Power Works — fuel and electricity

| Building | Contents | Purpose and encounter idea |
|---|---|---|
| Boiler house | Boilers, gauges, pipe galleries, coal hatch | Fuel; pressure release can clear a passage |
| Electrical substation | Transformers, fenced switchgear, control room | Batteries and electrical upgrades; restore local lighting |
| Fuel compound | Bunded tanks, pump kiosk, drum store, spill drains | High fuel yield, limited exits; fuel-stealing creature later |
| Compressor house | Compressor, maintenance bench, overhead air pipes | Rare upgrade parts; sound-sensitive enemies make timing useful |

Visual identity: all tanks on foundations; pipelines physically connect buildings; oil stains occur beneath equipment. Warm warning lamps contrast with cold green vegetation.

## 07 · Waterworks — flooded shortcuts

| Building | Contents | Purpose and encounter idea |
|---|---|---|
| Pumping station | Pump room, switchboard, maintenance gallery | Pump component and electrical loot; drain a chamber to open a route |
| Filter house | Filter beds, testing bench, store cupboard | Rare components; narrow raised walkways around water |
| Canal lock office | Gate controls, desk, first-aid locker | Restore footbridge / canal crossing |
| Service tunnels | Sluices, pipe chambers, cable junctions | Shortcut back toward Workers' Row; dangerous after dark |
| Collapsed glasshouse annex | Plant-filled frames, broken equipment, storage | Quiet landmark with concealed stash, not a generic greenhouse crafting system |

Visual identity: reeds, algae, damp brick, reflective water and roots. Water boundaries must be actual collision, not misleading painted paths.

## Asset pipeline — one painting is a layer, not the whole game

1. **Per-sector ground plate:** roads, soil, grass, rubble stains, foundations, interior floors and fixed low furniture. Bake only what the actor will never need to go behind or change.
2. **Independent collision:** traced wall segments, furniture footprints, terrain edges, door gaps. Never derive hitboxes from image opacity; all walkable routes get tested.
3. **Depth-sorted objects:** character, creatures, tree canopies, water towers, tall furniture and machinery. Sort by their ground contact point; fade an occluder near the player when necessary.
4. **Roof / foreground layer:** removable roofs and wall tops with enterable-building reveal. The home hall is roof-damaged and intentionally open; closed roofs can be added as matching layers later.
5. **Interactive layer:** generator, loot, shutters, moving parts, destructible barricades. Object state lives in simulation, not painted artwork.
6. **Lighting / effects:** night mask, lamps, sparks, smoke, damage feedback. Match the painting's light direction and palette.

Keep a world-coordinate manifest for source rectangles, visual bounds, ground anchors, collisions and interactable positions. Large later districts should use independently loaded background chunks; do not stretch one image across the entire ten-times-larger world. Warm contact shadows and consistent scale are mandatory for every new sprite.

### Home assets delivered

| File | Contents | Runtime use |
|---|---|---|
| `public/survival/home-ground-lossless.webp` | 1086 × 1448 opaque painting: roads, garden, interior floors, broken structure and fixed furnishings | One home-sector plate, drawn at 1800 × 2400 world units |
| `public/survival/home-props.png` | 1254 × 1254 transparent atlas: tree, water tower, salvage shelter and supply rack | Tight source crops in `HOME_FRAMES`; separate ground anchors, collision and depth sorting |
| `src/factory-map.ts` | Rooms, entrances, loot, collision, prop bounds and foreground wall rectangles | Shared by browser and Expo; art and gameplay use the same coordinates |

Existing worker, generator, creature and machinery assets are reused. No separate final-art assets have been produced for the six unbuilt districts yet: each district should follow the same paint → collision → layering → interaction → visual/playtest sequence before proceeding to the next.

## Build order and acceptance

### Modular home revision

The active home now uses `public/survival/home-ground-empty.png`: the same architecture and routes, with indoor furniture removed and a less noisy, chunkier painted treatment. The previous furnished painting is retained, not overwritten. `public/survival/home-salvage.png` provides separate, aspect-preserved supplies, room furniture, machinery and crate damage states; crop rectangles live in `src/home-art.ts`.

- Six wooden crates are solid until broken with two bat hits. They leave non-solid wreckage and drop resources once per run.
- Three marked lockers can be searched once per run. Their contents become actual ground pickups, including when the bag is full.
- Loose scrap, fuel cans and pallet bundles require the nearby PICK UP button. Walking over supplies does not collect them. A full bag leaves them on the ground.
- Pickups use a small pale dot; crates use an amber diamond; lockers/machine controls use a small square. Only the nearby selected target gets a floor accent and short label. Ordinary furniture has no marker. Walls obstruct pickup and melee.
- The worker and walk animation atlas are unchanged. Supplies go into the backpack; no resource is drawn in the worker's hands.
- Furniture, crates, loot, foreground walls and actors share ground-contact depth sorting. Crate collision and pathing update with destruction.

Beds, benches, terrain, vegetation and building walls are not currently destructible. This pass establishes modular placement and honest interaction cues, not a promise that every piece of scenery is interactive. Doorways, crate destruction, locker search, resource conservation and the original day/night survival loop have automated checks. Physical iPhone performance and touch feel still require device testing.

Home first, then Workers' Row, Scrapyard, Power Works, Rail Depot, Foundry and Waterworks. This is a production sequence, not a fixed night-unlock promise. Reachable routes, return time and survival difficulty determine unlock timing.

Home acceptance: worker can reach each building and return; scenery matches collision; starter loot is accessible; generator/shutter/crusher/barricade interactions still work; night enemies can reach the base; full-screen on-map controls remain; shared web/native renderer uses the same art and map data. Check phone-sized screenshots, compile web/native, simulate movement and a full night. Real iPhone frame rate and co-op balance remain separate testing steps.

### Expanded home grounds

The home sector now has exactly twice its previous world area (1800√2 × 2400√2). The regenerated 1086 × 1448 ground plate depicts the same three buildings at smaller relative footprints, keeping their approximate world sizes and preserving the worker, modular props and camera scale. Wider linking paths and open grassy/dirt clearings occupy the added space. Furniture, loot, lamps, well, fire and animals have independently authored positions. Walls and foreground occluders are traced against the new painting; navigation grid dimensions derive from world bounds. The complete route, survival-night and food/water regression checks pass, as do web/native TypeScript and iOS export. No additional sectors or loot counts were introduced.
