# Three-bay warehouse and stone furnace

The approved long warehouse faces southwest beside the eastern camp path. Its
three separate bays show the actual stored wood, stone and scrap metal. Empty,
partial and full states reuse one fixed building silhouette and two textures;
only the bay interiors change. The warehouse panel uses the same masks.

The western furnace has the approved stone chimney, left-hand covered bellows
and southeast fire opening. Animated flames, light and finished ingots align
with its new artwork. Both buildings retain their existing IDs, interactions,
repair costs, camp unlocks, inventory and smelting state. Broken buildings use
matching ruined artwork and recover the new design when repaired.

Generated transparent originals are retained in `art-source/camp-worksites-v3`.
`scripts/package-camp-worksites-v3.mjs` creates the five runtime WebPs, retaining
alpha and canvas registration at 1152×768 (warehouse) and 960×640 (furnace).
They total about 1 MB encoded and 14.8 MiB decoded. Ground-contact moss, leaves,
stone feet and irregular soil edges are baked into the sprites.

The version-2 worksite migration replaces only the two authored buildings,
keeps later owner moves, and does not recreate removed buildings. Existing runs
keep supplies and furnace queues. The saved-run collision migration finds clear
nearby ground if the new footprint would cover the player or camp return point.
The native bundle includes editor revision 86, retaining the latest unrelated
HQ, workshop, medical tent, well and foliage placement edits.

Validation: web/native TypeScript; smelting and furnace menu checks; warehouse
transfers and all 27 stock combinations; camp repair progression; native offline
renderer, approach paths, existing-save migration and seven rendered views;
Expo iOS export. Native renderer proofs are in `docs/qa/camp-worksites-v3`.
These checks do not measure performance on a physical iPhone. The local browser
preview cannot load the production database APIs; live deployment uses its
existing D1/R2 bindings.
