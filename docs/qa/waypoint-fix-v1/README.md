# Waypoint gesture and edge guide fix

Repeated map pinch regression uses the actual React map and stable-root zoom adapter. Synthetic pointer capture is stubbed because synthetic contacts cannot own browser capture; releases are sent to the stable root to reproduce the handoff.

- Previous map handlers: FAIL, tap after stopped/repeated pinch did not place a waypoint.
- Updated handlers: PASS, four repeated pinch/release/placement cycles, 10px thumb jitter, drag rejection, and no movement input.
- Continuous gameplay/map zoom round trip: PASS with the same contacts across mounting/unmounting.
- Normal map placement and gameplay removal: PASS through visible controls.
- Shared geometry checks: eight directions across portrait/landscape/small phone and nonzero safe insets; tip stays 7px from safe border; remove control remains in bounds; exact arrival stays at edge.
- Web and native TypeScript: PASS.
- Existing map registration and play-zoom checks: PASS.

The guide uses teal/brass double chevrons on the screen border with a separate remove control, no circular badge. Native rendering is confined to a 96px canvas. The map artwork and geographic geometry are unchanged. Screenshots show the real HUD component fixture, not a gameplay render. No physical iPhone test was performed.
