# Waypoint toolbar and terrain pin

- Navigation uses the existing teal utility button immediately left of settings. Landscape measured positions: navigation x692, settings x742, both y17, 40×34px, 10px gap.
- The needle tracks player-to-destination bearing; a browser movement exercise changed rotation from 1.68694 to 4.39064 radians. North crossings take the shortest turn.
- Pressing the direction button opens the live map with the destination retained; map removal remains available.
- Portrait moves the sky instrument below the first row while a waypoint is active. Checked 320×568, 390×844, and 844×390. Expanded vitals move below the instrument.
- Ground ring and pin use the shared world camera and Skia-compatible renderer. The screenshot uses the actual game terrain/art and the web Skia renderer, with no cloud writes. Local QA resolves packaged native artwork and compressed texture aliases because it has no asset API.
- Arrival clears the waypoint within 300 world units (roughly six short steps). Shared tests cover both stepWorld and stepCampPlaySession, the radius boundary, distant preservation, and unrelated-scene preservation. Browser arrival check confirmed the navigation button count becomes zero.
- Repeated pinch regression passed four cycles, including captured pointer releases, thumb jitter, drag rejection, and no walking.
- Existing continuous zoom and map geometry tests pass. Web/native TypeScript pass. No physical iPhone test was performed.

Only the rotating needle component updates while the player moves; the HUD layout only changes when the destination changes. Terrain rendering draws one small vector marker only when its destination is in view. No new image textures or broad render-layer allocations are required.
