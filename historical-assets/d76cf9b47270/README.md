# Western camp — ground-only correction

Built-in ImageGen edited ten close-up patches for the five existing runtime pieces 22–26 (master batches A1–A4). The owner's two October 14 videos showed that the previous terrain had foliage painted into the floor. The intended background is basic soil, flat grass colour/texture and paths; separately placed plants supply depth and density.

No new land, routes or placed foliage were added. Camp textures and saved placements are unchanged. Narrow original camp/older terrain contact strips are retained for continuity, rather than spreading their foliage into the new interior. This pass does not clean all 21 older extensions.

## Provenance

- `prompts.json`: final prompt for each accepted generation; built-in `image_gen.imagegen`, not CLI.
- `*-generated-original.png`: accepted unmodified native outputs.
- `*-edit-target.png`: existing-image editing targets with real adjacent contacts. White interiors are editing masks/guides, not runtime art.
- `*-registered.png`: generated detail registered to exact neighbouring contacts.
- `*-generation.json`: native dimensions and registration scale, never more than 1.1× enlargement.
- `a1-master.png` through `a4-master.png`: continuous registered artwork before runtime cuts.
- `public/survival/maps/west-camp-v2/manifest.json`: five final files, coordinates, decoded lossless checks and nine exact contact checks.

Every creative replacement pixel comes from ImageGen. Sharp only prepares reference crops/path guides, registers preserved contacts, assembles and losslessly packages images. Discarded drafts which merely recoloured plant outlines brown are not used.

## Reproduction

Run all preparation, registration, assembly and packaging commands with `WEST_CAMP_ART_VERSION=west-camp-v2`.

1. Register `a1n`, then `a1s`; assemble `a1`.
2. Register `a2ne`, `a2nw`, `a2se`, `a2sw`; assemble `a2`.
3. Register `a3e`, then `a3w`; assemble `a3`.
4. Register `a4e`, then `a4w`; assemble `a4`.
5. Run `node scripts/package-west-camp.mjs` with the same version environment.

Pass a copy of each archived native output to `prepare-west-camp.mjs register <patch> <copy-path>` so the source is not copied onto itself. The unchanged v1 originals and retired runtime exports are preserved in the neighbouring v1 archive. The v2 module keeps all original geometry and fade values, changing only versioned image/cache keys.
