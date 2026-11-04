# Camp furnace and warehouse

The furnace occupies the western workshop lot at (870, 800), with its firebox
facing southeast towards the approach. The eastern warehouse at (2960, 1645)
opens southwest towards the ring path. These perspectives are painted into the
sprites; neither is a flat rotation of a south-facing sprite.

Both use weathered timber, stone feet and irregular ochre contact soil. The export
pipeline preserves the architecture and generated transparency, then feathers
only the outer soil apron to expose the actual terrain. Runtime images are
768px (furnace) and 1024px (warehouse), with no additional per-frame terrain pass.

Artwork source and exact built-in image generation prompts are retained in
`art-source/camp-worksites-v2/`. Runtime exports are in
`public/survival/camp-worksites-v2/`. Empty, partial, full and damaged warehouse
states share one alignment; only the interiors of its bays change with stock.
Both structures have matching damaged states. Furnace fire and ready ingots
are drawn at their new positions.

The one-time `campWorksitesVersion` migration changes only the two known placed
objects, retains their IDs, and preserves subsequent editor moves and removals.
Continued expeditions retain inventory, repair state and furnace queues; the
existing safe-placement migration moves an obstructed player to nearby ground.
The bundled iOS world starts from live editor revision 86, including the owner's
latest unrelated changes.

Validation: TypeScript; warehouse storage and nine stock combinations; furnace
menu and ironworks simulation; production native renderer with offline Expo
asset shims, approach/collision checks, save migration and seven rendered states.
See `docs/qa/camp-worksites-v2/native-verification.json` and its images.
This is renderer and simulation verification, not a physical iPhone performance
test. The local main web preview has no live database API.
