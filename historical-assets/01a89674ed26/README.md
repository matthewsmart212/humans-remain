# Headquarters furniture and camp ground

Three original transparent 1254 × 1254 PNG masters were made with the built-in image-generation tool, one request per sprite. Runtime WebP exports are lossless and preserve the source pixels and alpha. The existing headquarters, terrain, walls, character and all fire animation frames are unchanged.

`scripts/prepare-hq-furniture.mjs` installs the three sprites into the existing catalogue and records sizes, source anchors and ground-only collision polygons. The exploration bench reuses the existing `art_camp_planning_board` ID and retains its links to research and expedition planning. It has no menu or interaction implementation. Both box props are independent placeable artwork. No saved map was modified or furnished automatically.

Default canvas widths: chest 144, supply boxes 128, bench 216 world units. `scripts/render-camp-additions.mjs` stages them against the current uploaded headquarters, renders four actual player sprites and checks a 60-unit-wide approach from the door to each item. This is a local layout proof, not multiplayer implementation or a persisted arrangement.

The headquarters soil trace and shared fire-pit soil bed reuse `artwork-archive/wall-ground/painted-earth.png`. Regenerate them with `scripts/prepare-camp-ground.mjs`. All 27 lit/unlit fire sprites resolve to one stationary bed. HQ ground is attached only to the exact current source upload, avoiding a mismatched treatment if the user replaces that picture later. The terrain pass draws both beds beneath every asset and character; no new collision or selectable ground is introduced.

## Exact generation prompts

Each prompt used this shared text, followed by its asset paragraph:

Use case: stylized-concept.
Asset type: one transparent 2D furniture sprite for a hand-painted cozy wilderness and salvage survival camp game.
Visual style: match the inspected headquarters cutaway: weathered warm grey and taupe timber, desaturated brown wood grain with warm ivory worn bevel highlights, painterly but very crisp chunky outlined forms, fine intentional painted grain and a few nailheads. Subtle charcoal dark iron fittings, tiny aged brass accents. Cozy rustic salvage craftsmanship, no fantasy ornament.
Camera: elevated three-quarter view, top surface clearly visible, primarily front face and right end visible; the long front edge slopes slightly down toward the right, approximately 18 degrees, exactly like the headquarters floorboard direction. Consistent simple orthographic game perspective, no lens distortion.
Lighting: upper left, gentle warm highlights with restrained shading. Only a minimal soft contact shadow immediately under feet or base.
Composition: square image, ideally 1536 by 1536 pixels, highest useful sharp sprite detail. One isolated compact object centered, all feet/base and full silhouette visible with 8–12 percent transparent padding. Genuine alpha transparency everywhere outside object and tiny contact shadow.
Avoid: scene, backdrop, wall, floor, pedestal, ground patch, foliage, floor mat, people, character, chair, stool, signs, labels, lettering, readable text, numbers, watermark, border, UI or menu; no extra separate objects around the furniture; no tall shelving or big projecting clutter.

### Chest

Primary request: a compact closed wooden storage chest for the headquarters interior. Low squat rectangular chest, flat closed plank lid, robust chunky beveled wood corners, two narrow dark iron corner straps that continue over the lid and down the front, a modest aged brass latch centered on the front. Four very short feet or a shallow raised base. Closed and neatly self-contained. Keep the chest practical, compact, and legible at small game scale, with the long dimension left to right. No lock dangling far from the surface, no contents visible.

### Supply boxes

Primary request: a compact stack of exactly TWO closed wooden supply boxes for the headquarters interior. One squat rectangular wooden supply crate on the bottom and one slightly smaller closed wooden crate stacked stably on top, with a small modest offset. Both long front edges aligned to the same headquarters perspective. Thick beveled reinforcing wood slats, a few restrained dark iron corner straps and nailheads, one tiny aged brass hardware accent. No markings, no labels, no visible supplies, no open lid. The two boxes form one compact cohesive sprite, low enough to fit a small room without obscuring characters.

### Exploration bench

Primary request: a small exploration and planning bench for the headquarters interior, a compact wooden desk with a parchment map lying flat on the top, two tightly rolled parchment plans, one small aged brass compass, and one closed small notebook. All these small items sit securely within the tabletop silhouette and stay low. The map has faint abstract terrain lines only, absolutely no letters, numbers, words or readable symbols. Simple sturdy four-legged wooden desk with chunky worn beveled tabletop, subtle iron corner fittings, and open knee space underneath so a character can approach from the front. No stool or chair, no tall backboard, no shelving. The entire front edge and the usable open knee space must be visible. Compact width appropriate for a headquarters accommodating four characters.
