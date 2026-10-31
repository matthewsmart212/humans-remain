# Scrap Hound artwork v1

Five transparent painted animation atlases reproduce the approved olive/rust mechanical canine from the owner's enemy lineup. The upright pointed ears, angular long muzzle, glowing red slit eyes, olive armour, bronze joints, broad metal paws and short mechanical tail carry through the five source headings.

The runtime set has sixty distinct poses in five 1536×1152 WebP atlases, with twelve 384×384 cells each. The common foot anchor is `[192,320]`; the proposed runtime display size is 215 world pixels. Down, down-left, right, up-right and up sources mirror to all eight headings. Every source frame uses the same 0.84 packing scale. Horizontal registration uses each view's fixed mean walk origin; vertical registration is translation to the common foot baseline. No frame or view is independently resized.

Frame order is 0 alert idle; 1–3 run strides; 4 Overdrive crouch; 5 extended airborne pounce; 6 open-jaw bite; 7 braced skid/recovery; 8 recoil; 9 heavy stagger/vented crouch; 10 collapse; 11 disabled. Runtime code supplies actual movement, leap height, lights and dust; the images contain no baked floor, shadow circle, trails or effects.

`atlas.json` registers `eyes` and `vents` per source heading and frame in packed-cell `[x,y,r]` coordinates. Reviewed seed locations are refined against local painted red pixels where present; dark dorsal apertures retain reviewed locations. Rear views intentionally have no eye emissions. The down-left rearing recoil (8) hides the back aperture, so its vent array is empty rather than placing light on the chest. Down-left collapse and all disabled poses have no vent emission. Rear live poses retain both dorsal apertures.

The atlases preserve generated alpha. In the right source, pixels outside the metal character have non-black RGB values but zero alpha; they remain invisible in correct alpha compositing. No colour keying, background removal heuristic, repainting or recolouring was used. The discarded background-extraction trial is recorded in provenance; the original right source was retained.

Run `python3 scripts/prepare-scrap-hound-v1.py` to reproduce all runtime textures and metadata. Inputs, exact image-generation prompts, reference and built-in generator provenance live in `art-source/scrap-hound-v1`. The script validates sixty distinct cell payloads, actual alpha gutters of at least nine pixels, nonempty sprite bodies and the total WebP budget. Current WebP total, including thumbnail, is 1,605,858 bytes. Source artwork is about 8 MB; it stays outside the deployment's public directory.

Registration contact sheets under `docs/qa` are internal visual QA: cyan marks eye locations and green marks dorsal vent locations. They are not game textures.
