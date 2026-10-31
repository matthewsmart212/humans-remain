# Camp return — finer terrain repair

The owner reported that sections 18 and 19 looked strange and low resolution. The previous 1740 × 904 landscape was stretched over the entire 3204 × 1666 contact master, and its earth and grass repeated a coarse circular surface pattern. This repair replaces only those two images.

The artwork was rebuilt with the built-in image-generation tool as four close-up patches. The first attempt still repeated the coarse pattern and was revised before using it as the reference for the other patches. The selected sources use quieter flat brown earth, sparse small grit and short olive grass. Existing northern leaves remain confined to the contact. No roads or standing scenery were added. All exact prompts are in `generation-prompts.json`.

| Patch | Native selected image | Registered region |
| --- | --- | --- |
| Northeast | 1599 × 984 | 1670 × 1026 |
| Northwest | 1660 × 948 | 1798 × 1026 |
| Southeast | 1712 × 919 | 1670 × 896 |
| Southwest | 1776 × 886 | 1798 × 896 |

The greatest linear enlargement is 1.084×, compared with approximately 1.84× before. Each `*-generated-original.png` is the selected native source. The assembled master is not claimed as a single native-resolution generation. `repair-camp-return.mjs` prepares the actual neighbour contacts, registers each patch and assembles them; `package-camp-return-repair.mjs` cuts the runtime textures losslessly. Registration is limited to contact bands; no code-generated surface detail or sharpening is used.

| Runtime file | Camp source origin | Dimensions |
| --- | --- | --- |
| `public/survival/maps/camp-return-v2/18-camp-southeast-meadow.webp` | 4096, 4668 | 1666 × 1538 |
| `public/survival/maps/camp-return-v2/19-camp-works-open-ground.webp` | 5630, 4668 | 1538 × 1538 |

The first four northern output rows before the east overlap, the 132 columns shared by the two runtime images, and the final 36 columns at the eastern contact all match their neighbours exactly after decoding. The footprint, feather widths, world scale, camera and saved placement coordinates are unchanged. New v2 URLs and keys avoid reusing cached v1 art; v1 files remain available for older tabs. Texture dimensions and resident texture memory are unchanged.

The existing movement/streaming checks pass with the new keys, including continuous crossings, missing-texture blocking, preserved camp placements and save validation. Production CanvasKit captures in `docs/qa/camp-return-v2` include one rendered pixel per source pixel in both interiors, the internal four-patch junction and the northern/eastern joins. The regular landscape, portrait, night, whole-world and missing-neighbour views are also retained. Physical iPhone/browser testing was not available in this environment.

The expansion plan remains west beneath camp, then around its western and northern sides. This repair adds no new land.
