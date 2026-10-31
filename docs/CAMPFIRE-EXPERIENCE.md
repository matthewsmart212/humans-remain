# Campfire experience

The campfire interaction now keeps the live game world on screen. A compact illustrated tray replaces the cooking dashboard: raw ingredient tiles, four cooking slots, cooked meal stacks, and an Add Wood tile. The tray docks below the scene in portrait and beside it in landscape. Short screens use a compact layout. Opening or closing the tray preserves the player's chosen zoom. If the tray would cover the character or serving board, the camera eases only far enough to clear it, then eases back on closing. Reduced motion disables the easing.

## Recording polish — 20 October

The supplied 23-second iPhone recording showed an automatic zoom/reframe when opening the campfire, a closing snap, clipped ingredient action labels, and overly dark unavailable items. The zoom override is removed. Camera scale is now identical before, during, and after tending, including rapid reversals and both render densities. The inherited editor-button gap and disabled opacity are explicitly reset. Raw ingredient and wood tiles state why they are unavailable; the active cooking timer is larger, the queue names its waiting jobs, and ready meals have a brighter serving treatment. Focus uses `preventScroll` so keyboard focus cannot shift the web viewport.

While tending, the tray owns the fuel clock and meal-ready feedback, leaving the world unobstructed by duplicate gauges and notices. The floating world gauge returns on closing and sits above the flame. Log-landing feedback remains visible. Existing gameplay, inventory balance, artwork, and authored placements are retained.

## The play loop

### Follow-up fixes

The intermittent blue screen was an opaque `#31535c` editor-button hover style covering the world through the full-screen dismissal button. Its background and decoration now stay transparent across hover, active, and focus states, including retained touch hover. The serving table is 50% wider and sits entirely to the right of the fire, with a shared footprint used by rendering, collection animation, and camera clearance. Six meals have distinct, non-overlapping positions on its surface.

- Hunt wildlife and collect its raw meat. Chop trees and collect their logs.
- Approach the campfire and press Fire. Tap a log or a raw ingredient in Your Supplies.
- A log leaves the player's hands, lands after 0.55 seconds, then adds 90 seconds of fuel. An extinguished fire relights on landing, with sparks and a floating time gain.
- The in-world fuel gauge drains continuously and shows the remaining time. The fire goes out at zero.
- Meat appears on the painted roasting spit, gradually changes to its cooked artwork, and releases steam. Cold fires retain cooking progress.
- Finished food appears on a wooden serving board. Tap a cooked meal to take one, or Take All for everything that fits. Collection animates back toward the player.
- The world keeps running. Nearby danger closes the station and restores combat controls. Tap outside the tray, the cross, or Escape to leave.

The previous survival balance remains: 24 kg pack, 18 kg comfortable load, four queued recipes, six meals on the serving rack, and chicken/rabbit/wild-meat cooking times of 12/8/18 seconds. Incoming logs reserve fuel capacity; repeated taps cannot consume wood beyond the eight-minute fire limit. Time spent in interiors replays log landings and burning in chronological order. Full packs retain food on the rack.

## Implementation and verification

`src/camp-kitchen.ts` owns the simulation. `src/campfire-view.ts` provides the same actions and state to the web and native panels. `src/campfire-layout.ts` provides native layout dimensions and the world-camera reservation. CSS mirrors those breakpoint choices. The production Skia renderer draws the spit, serving board, food, throws, sparks, steam, and fuel gauge on both platforms.

`scripts/check-campfire-experience.mjs` exercises a real chicken harvest, an accessible authored tree, log pickup, a cold cooking job, delayed ignition, cooking, collection, and eating. It also checks repeated refuelling, capacity, partial collection, the actual web/native button handlers, and camera behavior at five screen sizes × three zoom levels and both pixel densities. Opening, closing, interrupted transitions, reduced motion, and the unavailable-item labels have regression coverage.

The expedition checks and HUD checks cover retained inventory and interaction behavior. Web/native type checks, the production web build, and an offline iOS export validate integration. Native world images were rendered with the production CanvasKit/Skia path. The UI layout proofs combine that world with the actual native component tree through a software layout adapter; they are not browser captures or physical iPhone screenshots. Browser control was unavailable in this environment.

## Artwork

Generated with the built-in image-generation tool, with transparent backgrounds; resized and losslessly encoded for the game. Original food, fire, player, and HUD artwork is retained.

- `public/survival/camp-cooking-v1/roasting-spit.webp` — 768 pixels wide, approximately 121 KB.
- `public/survival/camp-cooking-v1/serving-board.webp` — 512 pixels wide, approximately 149 KB.

Spit prompt:

> Use case: stylized-concept. Asset type: transparent 2D survival game world sprite. Create ONE empty rustic campfire roasting spit frame, isolated on a truly transparent background. Hand-painted rich warm brown game art, bold clean dark ink outlines and warm highlighted wood grain, like a polished cozy chibi survival RPG asset. Three-quarter elevated view, seen from front and slightly above, symmetrical camera orientation looking north. Two thick crooked forked wooden uprights with bark, rope lashings at their forks, a thin dark iron skewer spanning horizontally between their tops, a small wooden crank handle protruding to the right. The frame spans much wider than its height (roughly 2.1:1), uprights at the far left and right, equal height and their feet on the same horizontal baseline. Most of the center under the horizontal rod is EMPTY transparent space where the existing game bonfire will show through. Skewer at 20% from top. Legs extend to bottom. No fire, no stones, no meat, no ground, no floor, no shadow plane, no backdrop, no text. All limbs fully in view. Generous transparent padding. It must layer cleanly over an existing campfire and behind separately animated food. Detailed painted wood and rope, not flat vector geometry.

Board prompt:

> Use case: stylized-concept. Asset type: transparent 2D survival game prop sprite. ONE small empty rustic serving board / food tray, elevated three-quarter top-down view, front edge horizontal, isolated on truly transparent background. Hand-painted polished cozy chibi survival RPG art, warm brown wooden planks, bold dark ink outlines, golden wood grain, slightly chipped irregular edges, two short cross battens underneath barely visible, two dull iron corner nails, a tiny sprig of green herbs tucked at the upper left corner. Rectangular shape roughly 1.6 times wider than deep; clear flat EMPTY center occupying most of board where separately rendered cooked meat will be placed by the game. No meat, no food on the surface, no plates, no lettering, no UI, no ground or scenery, no surrounding cast shadow. Fully framed with transparent padding. Rich painted texture, perspective seen from front and above, not a flat vector illustration. Match an illustrated forest survival campfire game.
