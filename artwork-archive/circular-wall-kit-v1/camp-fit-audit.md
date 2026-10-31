# Circular wall kit: camp fit audit

Audit date: 31 October 2026. Source commit: `f228d212f5f167d7ec89d24ba86f682aa801f1a7`.

## Status and scope

This report supports a **standalone set of sixteen orientation-specific wall images**. The base kit forms an unbroken circle. It is **not registered in the runtime, placed in the world or deployed to the live game**.

The base kit does **not** include shortened road-opening sectors, road end-post variants, a world migration or a new editor placement feature. Those require a later integration pass. The six existing roads must remain open when that integration happens.

The latest exported draft and native snapshot contain 4,543 placements and `campPerimeterVersion: 4`. The eleven original wall placements match `src/camp-original-wall-layout.json`. Version 4 removes gates and preserves the owner's existing wall positions.

## Proposed circle

| Parameter | Value |
| --- | ---: |
| World centre X | 1718.1675873489273 |
| World centre Y | 1573.5124773329626 |
| Centreline radius | 1650 world units |
| Suggested base thickness | 80 world units |
| Inner radius | 1610 world units |
| Outer radius | 1690 world units |
| Number of sectors | 16 |
| Angle per sector | 22.5 degrees |

The centre is the actual bonfire placement, ID `06c42057-0d46-43ef-977b-f183d7c50561`, in the exported world draft. A portable art kit can use local centre `(0,0)` and add the world centre at placement time.

Angles start at north and increase clockwise, with world Y increasing downward:

```text
x(theta) = centreX + radius * sin(theta)
y(theta) = centreY - radius * cos(theta)
```

The game camera uniformly scales world X and Y. It does not apply a global isometric compression to the ground. The base outline should therefore be circular in these coordinates; illustrated timber height extends upward from that outline.

### Headquarters clearance

The large headquarters uses asset `base_shelter_t1`, placement ID `4d468bcc-83b9-4bb7-af01-da4b69a67d9a`. Its saved collision polygon reaches a maximum radius of **1564.75 world units** from the bonfire, at approximately `(2761.57,407.43)`.

The proposed inner wall radius of 1610 leaves approximately **45.25 world units** at that vertex. Another northern vertex, `(1953.91,46.60)`, has radius 1545.00. A circle with radius around 1400 would intersect the headquarters.

These values come from transforming the saved normalized polygon using the placement's frame, anchor and scale. They establish a conservative candidate for art production. They do not replace a final audit of all buildings, props, foliage, navigation, sprite overhangs or gameplay collision. Increasing the ring to this radius also moves much of the wall outward relative to the old irregular layout.

### Existing perimeter diagnostic

A least-squares circle fitted to the twelve saved road-opening endpoints has centre `(1737.87,1593.81)`, radius 1403.96 and RMS radial error 27.25. A fit to the available current wall polygon vertices has centre `(1766.62,1656.72)`, radius 1397.05 and RMS error 102.89. The latter includes inner and outer edges and omits the non-solid wall without an explicit polygon, so it is only a diagnostic.

The map's circle, `(1700,1550)` with radius 1450, is **not gameplay geometry**. `src/player-map-camp-wall.ts` explicitly calls it a cartographic symbol and leaves gameplay walls, terrain and roads unchanged.

## Road openings for later integration

The current six openings are NE, SE, S, SW, W and NW. Their old endpoint traces are preserved in `src/camp-original-gate-layout.json` and in the accompanying JSON report. They must not be copied unchanged onto the enlarged ring.

The table below gives preliminary intersections between the proposed radius-1650 circle and the registered road centreline polylines in `src/player-map-camp-roads.json`. Suggested ranges add 60 world units on each side of the road and correct for its crossing angle.

| Opening | Centreline intersection | Angle from north clockwise | Suggested clear angular range |
| --- | --- | ---: | --- |
| NE | (2824.46, 349.33) | 42.104 degrees | 37.059–47.149 degrees |
| SE | (2896.97, 2728.04) | 134.404 degrees | 129.343–139.464 degrees |
| S | (1651.02, 3222.15) | 182.332 degrees | 177.827–186.837 degrees |
| SW | (626.02, 2810.33) | 221.446 degrees | 216.329–226.562 degrees |
| W | (148.65, 2082.55) | 252.031 degrees | 247.083–256.978 degrees |
| NW | (595.60, 364.24) | 317.129 degrees | 312.419–321.840 degrees |

These are **planning measurements**, not completed game openings. The registered atlas traces approximate the painted paths; the calculations use their polyline segments rather than the map renderer's quadratic smoothing. Verify the actual ground art, path shoulders and player clearance before creating final road variants or migrating the world.

For integration:

- Shorten each standard sector wherever an opening intersects it.
- If an opening straddles a standard sector boundary, create shortened variants for both adjacent sectors.
- Finish open ends with appropriate posts; retain the current no-gates design.
- Do not remove one whole 22.5-degree sector per road. At radius 1650 that removes about 648 world units of wall arc, far wider than the roads.
- Use new road intersections after enlarging the circle, not the previous gate coordinates.

## Asset and engine conventions

Each sector needs its own painted orientation. Runtime rotation rotates the entire image, including upright timbers and lighting, so pieces should be placed with `rotation: 0` and no flips.

Record each image's canvas size, normalized ground-midpoint anchor, start/end ground positions, angular interval, world dimensions, collision outline and boundary-post ownership. The anchor should follow the ground midpoint, not the visual centre of the tall wall image.

`src/world-layout.ts` supports normalized closed polygon paths and open polyline paths in placement-specific collision data. A sampled circular line or annular polygon is therefore representable with the existing collision model.

`src/placed-world-renderer.ts` currently calculates wall depth and fade from only the first straight segment. The eventual curved wall integration needs an occlusion review. Keep each upright painted volume whole: radial cuts in screen space can split vertical timber faces. The current renderer includes a comment documenting the visible cuts caused by a previous screen-column slicing approach.

## Independent geometry guide review

The generated guides in `geometry/` were reviewed independently on 31 October 2026 by decoding every PNG and recalculating the manifest's formulas. The checks passed:

- All sixteen images are 1536 × 1536 RGBA PNGs with real transparency spanning alpha 0 to 255.
- The sixteen angular intervals cover exactly 360 degrees.
- Stored endpoints exactly match the radius-1650, north-clockwise formula.
- The maximum collision-centreline radial error is approximately `2.27e-13` world units, a floating-point rounding residual.
- Stored anchor pixels exactly match the declared crop centres and 1.4-pixels-per-world-unit scale.
- The final seam closes within approximately `4.04e-13` world units.
- The minimum nontransparent-content margin is 166 pixels; no guide is clipped at its canvas edge.
- There are 48 unique owned post angles, three per sector.

Visual review of the contact sheet and clay ring showed consistent upright timbers and a continuous circular foundation. The clay ring is a depth-buffered render of the combined geometry, **not a composition of the sixteen independent painted images**. It validates the geometry scaffolds, but final painted-image registration, sprite order and seam appearance still require their own assembly review.

## Source paths

All paths below are relative to the repository root.

- `migration-data/world-layout.json`: exported world draft and placement-specific collision.
- `native/assets/world-snapshot.json`: matching native world snapshot.
- `src/camp-original-wall-layout.json`: eleven saved original wall placements.
- `src/camp-original-gate-layout.json`: six original opening traces.
- `src/camp-perimeter.ts`: version-4 gate removal and wall preservation.
- `src/player-map-camp-roads.json`: registered painted-road trace coordinates.
- `src/player-map-camp-wall.ts`: decorative map circle and road smoothing.
- `src/world-layout.ts`: placement frames, anchors, transforms and collision.
- `src/world-camera.ts`: uniform 2D camera.
- `src/placed-world-renderer.ts`: image transforms, depth and wall fading.
- `src/world-assets.ts`: asset dimensions and perimeter metadata.

The machine-readable measurements and limitations are in `camp-fit-audit.json` alongside this report.
