# North-east camp entrance correction

The painted stone road crosses the circular camp wall near 51.2 degrees, while the previous opening was centred at 42.1 degrees. This update moves only that opening to 47–57 degrees by extending section 02 and shortening section 03. The other fourteen installed pieces and all five other openings retain their published geometry and darker artwork.

## Implementation

- Two new dark weathered sprites use separate asset IDs. Original 02/03 sprites and collision remain resolvable for custom placements and deferred saved runs.
- Perimeter version 6 migrates only untouched canonical NE placements from version 5. Owner changes and deletions remain intact; earlier camps install the revised plan directly.
- Saved-run migration preserves gameplay state and moves newly obstructed player/return positions only to nearby clear ground.
- The NE map road trace follows the actual painted terrain. The terrain itself is unchanged.
- Fresh installations retain the three previously approved scenery-clearance adjustments, including the rock beside this entrance.
- Native image registration and the offline world snapshot include the corrected pieces.
- The pending sixteen-piece darker recolour from published version 326 is included in this GitHub worktree.

## Verification

TypeScript, production build, layout/collision, runtime/saved-run, Worker persistence and native shared-renderer checks passed. Reports are in this directory. All six entrances have bidirectional routes; 777 road corridor samples pass. All 18 circular-wall images are registered, with 16 active and two retained for compatibility.

`after-road-alignment.png` and `road-alignment-before-after.jpg` composite the actual streamed terrain and registered wall sprites at their exact world coordinates. `native-wall-844x390.png`, `native-wall-390x844.png` and `native-installed-camp-overview.png` exercise the shared native renderer through CanvasKit shims; they are not physical-device test captures.

ImageGen prompts, original outputs, geometric guides, registration metrics, preservation hashes and seam review are retained in `artwork-archive/circular-wall-ne-v2/`. The two generated originals were packaged using the built-in image-generation workflow, with no generated terrain or changes to unrelated wall artwork.

## GitHub storage

The small new weathered and NE image sets use scoped ordinary-Git exceptions in `.gitattributes`, so the connected GitHub API can save their complete bytes without separate LFS upload credentials. Existing assets and their LFS pointers remain unchanged. The local commit is ready for the public shared repository, but a successful live publication does not imply that the GitHub update has been approved or pushed.
