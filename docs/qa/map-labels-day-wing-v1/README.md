# Fixed map captions and calendar extension

Map captions use one anchor per illustration: headquarters above the roof, other names below their symbols. They retain 13px text and 15px line height through zoom and pan. The previous candidate-position/collision search is removed, so the portrait or viewport edges cannot push a caption to another side. Off-screen/control-covered labels are clipped rather than moved.

All building names fade together as the projected camp diameter changes from 300px to 260px. At or below 260px only CAMP remains. The approved campfire symbol retains a 28px minimum width in the overview. World roads, terrain, walls, and building positions are unchanged. Native keeps the campfire in a separate retained picture so zooming does not rebuild the rest of the illustrations.

The sky bar expands a 72px calendar section to its left, displaying the current simulation day in the existing teal/brass artwork style. The sky animation, direction button, settings, and backpack retain their positions. The old dropdown and hanging day plaque are removed. Tapping again or Escape collapses it on web; outside presses also close it. Native has the same tap toggle and respects reduced motion. Portrait moves the sky instrument to the second row when needed so the extension does not cover vitals.

Verification:

- Shared map tests: fixed anchor pan deltas, no player-driven repositioning, constant label boxes across four viewports and three zooms, common detail fade, readable campfire symbol.
- Browser: seven labels at camp view, all 13px; only CAMP at world overview, still 13px.
- Browser 320×568 with waypoint controls: sky bar expands from x138/width120 to x66/width192; right edge stays x258, y61 unchanged; no old info panel.
- Browser: checked 390×844 and 844×390, including actual world artwork via the shared web Skia renderer.
- Existing sky orbit, waypoint, and continuous zoom regression checks pass.
- Web/native TypeScript and production build pass. No physical iPhone test was performed.
