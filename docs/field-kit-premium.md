# Field kit and horizon HUD

Backpack and storage now share the same illustrated field-kit components on web and native: canvas-green surfaces, stitched edging, worn-brass accents, inset item slots, a prominent item illustration, and a quiet carrying-weight strip. The web version adds a brief opening motion and respects reduced-motion preferences.

Storage uses **Pack item** / **Stash item**, with a quantity stepper only for stacks. **All** selects only the quantity the backpack can hold. Transfers still go through the existing ownership, headquarters, proximity, and weight checks. Invalid, negative, fractional, and nonfinite quantities are rejected. Gear, food, and harvesting rules are unchanged.

The approved horizon replaces the numeric clock: one fading 1px line, with the sun rising on the left, peaking above the center, and setting on the right. The moon follows the same arc at night. A short handover keeps the setting body at the right as the next one rises at the left. Position and handover both come directly from `cycleStatus` (120 seconds of daylight, 60 seconds of night), without an independent UI timer. Pausing freezes them. Reduced motion removes interpolation. Tapping reveals only the day, phase and weather, with no countdown.

Portrait places the horizon and Pause on the top row beside the compact vitals, with Backpack directly below Pause at the safe right edge. Vitals reserve room for the controls and compact on narrow phones. Expanded vitals open beneath the top row without moving the horizon or Pause. Landscape keeps the horizon, Pause and Backpack in one row. Web uses CSS transforms; native uses the native animation driver for the same shared arc coordinates. A shared black elliptical shade fades to transparency on every edge behind the horizon; regenerate it with `node scripts/create-horizon-shade.mjs`.

## Movement surface and action sizing

Gameplay has an invisible movement surface across the left 30% of the viewport, with no joystick base, thumb or trail. Each new touch records its own starting point and supplies zero movement until the player drags. Direction comes from displacement relative to that touch origin, with a 5px dead zone and full strength at 30px on both web and native. Returning to the starting point stops movement without lifting the finger. Dragging beyond the initial region continues tracking the same finger until release; the next touch chooses a fresh origin.

Only one pointer/touch identifier owns movement. The region sits beneath interactive HUD controls, so vitals, quickbar slots and right-hand actions keep their own touch handling. Release, cancel, lost capture, pause/modal/unmount, background and viewport changes clear movement. Web also handles Safari visual-viewport changes. The editor Walk-preview joystick is unchanged.

Primary action and Walk/Sprint now both use 46px buttons, 24px icons and 10px labels. The action's centre is retained at right/bottom offsets of 9px inside its existing cluster.

`node scripts/check-field-kit.mjs --no-proof --no-report` checks actual web/native handlers, zero movement on initial contact, equivalent drags from different origins, dead zone and strength limits, absence of joystick visuals, simultaneous action/movement ownership, lifecycle cleanup and matching button dimensions. Browser QA at 390×844 and 844×390 confirms the invisible region's sizing, a stationary held touch, drags from several heights, continued movement beyond the starting region, boundary rejection, HUD exclusions and pause. Web/native TypeScript and Expo iOS export pass; physical-device multitouch remains untested. The browser fixture uses the production HUD over a bundled terrain overview, rather than a hosted multiplayer session.

![Gameplay HUD without a visible joystick](qa/relative-touch-controls/controls-landscape.jpg)

## Original clock art (retained)

Created with the built-in image-generation tool, then resized/encoded to transparent 192px WebP assets (about 27 KB combined):

- `/workspace/sites/safety-last/public/survival/ui-sky-clock-v1/sun.webp`
- `/workspace/sites/safety-last/public/survival/ui-sky-clock-v1/moon.webp`

Sun prompt: Use case: stylized-concept. Asset type: production HUD icon for a top-down hand-painted survival adventure game. Create ONE isolated painted golden sun emblem, front facing and centered, transparent background. Looks like a beautifully illustrated carved wood and tarnished brass sun, chunky uneven eight rays, a warm amber center with subtle painterly grain, dark charcoal ink contour, cream highlights upper-left, deep brown shading lower-right. Polished cozy rugged wilderness game artwork, expressive hand-painted NOT photoreal, not shiny mobile casino gold, not flat vector. Strong clean silhouette that stays legible at 32px. Icon fills 78 percent of square canvas; generous completely transparent margin, no external shadow halo, no border or outer frame, no letters, no numbers, no face, no stars, no labels, no other objects. Palette warm ochre / honey / burnt orange / dark walnut. A premium inventory-style object illustration.

Moon prompt: Use case: stylized-concept. Asset type: production HUD icon for a top-down hand-painted survival adventure game. Create ONE isolated painted crescent moon emblem, horns pointing right, front facing and centered, transparent background. Beautifully illustrated carved crescent made of weathered pale blue silver and cream stone, chunky and thick, subtly chipped hand-painted surface, dark navy charcoal ink contour, warm cream highlights upper-left, deep muted teal shading lower-right. Polished cozy rugged wilderness game inventory artwork, expressive hand-painted NOT photoreal, NOT flat vector, no smooth 3D plastic. Strong clean silhouette legible at 32px. Icon fills 78 percent of square canvas; generous completely transparent margin, no external shadow halo, no border or outer frame, no letters, no numbers, no face, no additional stars or ornaments, no labels, no other objects. Palette ivory / desaturated pale blue / slate / muted teal. A premium inventory-style object illustration.

## Horizon art

Created with the built-in image-generation tool, then resized/encoded as transparent 128px WebP assets:

- `/workspace/sites/safety-last/public/survival/ui-horizon-v1/sun.webp`
- `/workspace/sites/safety-last/public/survival/ui-horizon-v1/moon.webp`

Sun prompt: Use case: stylized-concept. Production transparent HUD sprite for the user's hand-painted top-down survival game, matching the approved delicate horizon mockup. Create ONE small golden sun icon, isolated and centered, front facing, on a genuinely transparent background. A warm ochre circular sun with 8 short slightly irregular tapered rays, subtle painted amber texture, soft cream highlight at upper left and muted burnt orange shading lower right. Fine dark warm outline, very restrained soft amber edge glow. A charming painted 2D game illustration, NOT a glossy metallic button, not photorealistic, not carved stone, no face. Clean strong silhouette readable at just 20px. Sun fills 70 percent of a square canvas with generous transparent margin for ray tips. No line, horizon, frame, dial, circle border, letters, numbers, stars or other objects. The icon itself will move over a thin horizon drawn in code; do not draw the horizon. Premium but quiet, warm and natural.

Moon prompt: Use case: stylized-concept. Production transparent HUD sprite for the user's hand-painted top-down survival game, matching the approved delicate horizon mockup. Create ONE pale crescent moon icon, isolated and centered, horns pointing right, front facing, genuinely transparent background. Chunky but elegant crescent silhouette, warm ivory and cream highlight upper-left, subtle desaturated pale blue shading lower-right, soft hand-painted texture and a fine dark teal contour. Very restrained faint cool edge glow, not a large halo. Painted 2D game illustration, NOT photorealistic, not carved stone, no chips or rock cracks, not a glossy metallic button, no face. Clean silhouette readable at 20px. Moon fills 70 percent of a square canvas, transparent margin on all sides. No stars, line, horizon, frame, dial, circle border, letters, numbers, or other objects. This moon will move above a fine horizon drawn in code; do not draw a horizon. Quiet premium game artwork.

## Verification

- Web and native TypeScript checks.
- `node scripts/check-chest-ui.mjs`: actual web/native callbacks, gear transfer, quantity stepper, capacity-limited All, final-stack empty states, equipped fallback, and validation.
- `node scripts/check-backpack-ui.mjs`: use/drop, exact meal benefits, empty-pack selection, and quickbar ownership.
- `node scripts/check-wooden-axe.mjs`: 54 harvesting combinations, recoil, new-game inventory, axes, and assets.
- `node scripts/check-sky-clock.mjs`: actual 120s day / 60s night arcs, center peaks, clipped setting positions, simultaneous sun/moon handover, pause, next-day reset, portrait controls and notched landscape clearance.
- `node scripts/check-field-kit.mjs --no-proof`: input/controller/vitals checks; the old offline proof background is not included in a fresh checkout.
- Browser QA used the production components with real simulation state in temporary fixtures, at 390 × 760, 320 × 568, and 844 × 390. Tested packing/stashing, selected stack quantity, food detail, day/night appearance, expanded sky details, and pause. Fixtures removed before packaging.
- No physical iPhone test performed. The local preview does not include the hosted artwork API, so this is component-level browser QA, not a full hosted multiplayer session.

Horizon browser QA checked 390 × 760 and 320 × 568 portrait, plus 844 × 390 landscape. DOM measurements confirmed the portrait buttons have identical right edges and a 10px vertical gap, the horizon clears Pause, and expanded vitals do not overlap the group. Landscape buttons share one row and the line is exactly 1px high. Verified sky artwork loads, night motion advances, pause freezes it, Backpack opens/closes, and sky details contain no time display. Temporary fixtures removed before packaging.

The compact horizon uses a 96px span, a 30px artwork canvas and a shallow 14px rise. This matches the approved mockup proportions and keeps the sun visually connected to the hairline. Web sizing is sourced from the shared HORIZON constants, alongside native positions.
