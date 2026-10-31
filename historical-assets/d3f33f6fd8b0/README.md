# Return towards camp

This pass changes the expansion direction. Two road-free ground sections fill the southern gap west from the works clearing, meeting the existing camp southeast approach above. This is the first connection back towards camp; the main camp's remaining southern, western and northern surroundings are still to build. The revised order is recorded in `docs/world-terrain-plan.md`.

Created with the built-in image-generation tool. `generation-prompts.json` contains the initial constrained outpaint and the material-continuity edit. The selected native output is 1740 × 904. `generated-layout-original.png` preserves the first layout; `generated-master-original.png` is the selected final output; `registered-master.png` registers it to the existing camp scale at 3204 × 1666. Packaged dimensions do not imply native generation resolution.

| Runtime file | Camp source origin | Packaged size |
| --- | --- | --- |
| `public/survival/maps/camp-return-v1/18-camp-southeast-meadow.webp` | 4096, 4668 | 1666 × 1538 |
| `public/survival/maps/camp-return-v1/19-camp-works-open-ground.webp` | 5630, 4668 | 1538 × 1538 |

The edit template uses the actual northern camp approach/junction and the eastern works clearing. The 132-pixel sampling overlap between the new cuts is identical. Their first four rows before the eastern overlap match the northern composite exactly. The eastern image's last 36 columns match the existing works clearing exactly throughout its height. All decoded lossless contact checks report zero channel error in `terrain-manifest.json`.

The north uses a 36-pixel feather over the existing 96-pixel bottom fade. The westward connection reverses the existing horizontal rule: its 36-pixel right feather starts where the older eastern image's 96-pixel left fade becomes opaque. If that eastern image is unavailable, the new image keeps its overlap opaque. All previously published image files remain unchanged.

The ground stays open for free movement, with muted olive grass and brown earth. Orange leaves remain confined to the transition from the existing northern artwork. No new road or standing scenery was added. Camp scale, coordinates and saved placements are preserved.

Validation covers repeated walking across the new north, east and internal contacts; free walking through the former gap; the remaining inward southwest boundary; missing-image fallback; and streaming prefetch/release. Real save/read handlers against in-memory SQLite retain all 1,366 camp placements and accept objects on both new pieces and an off-path spawn. TypeScript passed. Production CanvasKit screenshots in `docs/qa/camp-return-v1` cover contacts, whole-world placement, portrait, night and missing eastern artwork. Browser and physical phone performance were not tested here.
