# Base walls 1–8: headquarters timber refresh

Built-in ImageGen produced eight independent detailed transparent wall edits, using each uploaded wall as the edit target and the current headquarters interior and roof as material references. Timber uses weathered grey-brown colour, pale worn cuts, deeper grain and restrained moss.

The generated illustrations reframed their subjects. Before integration, each visible main wall was fitted back to its original opaque-content bounding box on an exact 2× original canvas. World width, normalized anchor, collision lines, solid flags and saved placements are not changed. Fine post/wood contours are newly illustrated, not pixel-identical. Near-invisible neighbouring-image remnants in the original padding are not reproduced.

| Wall | Native generation | Final transparent canvas |
|---|---|---|
| 1 | 1330×1182 | 1168×1040 |
| 2 | 1390×1132 | 988×804 |
| 3 | 1281×1227 | 956×916 |
| 4 | 1410×1115 | 878×694 |
| 5 | 1087×1446 | 930×1236 |
| 6 | 1129×1393 | 930×1148 |
| 7 | 1231×1278 | 900×934 |
| 8 | 1079×1458 | 842×1138 |

Final files: `public/survival/base-walls-hd/wall-1.webp` through `wall-8.webp` (lossless alpha WebP).

`src/wall-artwork-replacements.json` matches each stable catalogue ID and its exact original uploaded file ID. The server artwork response and cached client records resolve to these files. Original uploaded bytes and database artwork history remain intact. Later uploads with different file IDs take priority. This updates already placed walls without creating new catalogue assets or rewriting the world's placements.

Verification: `scripts/check-wall-reskins.mjs <original-artwork-response.json>` checks all eight actual records for identical world dimensions, normalized anchors, collisions and flags; unchanged placement IDs; alpha and image dimensions; cached-record resolution; and future-upload priority. Visual comparison is in `docs/qa/base-wall-upgrade-comparison.png`.

## Generation prompts

Walls 1–4 used the following prompt, substituting wall number and original width/height (584×520, 494×402, 478×458, 439×347):

Use case: style-transfer. Asset type: transparent isometric strategy game sprite. EDIT TARGET is image 1 ONLY, existing damaged curved palisade wall segment {n}. Images 2 and 3 are MATERIAL/RENDERING REFERENCES ONLY (headquarters timber); do not reproduce any headquarters structure.
Primary request: faithfully reconstruct image 1 at native high resolution, ideally {3w} by {3h} pixels and at least {2w} by {2h}. Maintain EXACT {w}:{h} canvas aspect ratio, the same normalized occupied bounds, transparent padding, placement, clipping at canvas edges, curve, perspective, silhouette, and all breaks. Trace original geometry: every existing pointed timber post, broken stump, diagonal supporting brace, horizontal member, rope band, leaning timber, rubble and splinter must remain at its existing location and angle. Preserve every gap and damaged portion; do not repair or complete anything. Do not center, zoom, rotate, widen, straighten or rearrange.
Change only surface fidelity and wood material to match HQ references: painterly detailed weathered grey-brown oak, pale worn cut edges, dark grain fissures, fine knots, subtle existing moss/olive accents. Crisp actual newly reconstructed native detail, clean finely resolved silhouettes, rich modeled timber volume, coherent original soft directional lighting; not merely an enlarged blurry sprite.
Output only this exact wall segment on genuine transparent alpha, including fully transparent original empty regions. No backdrop, checkerboard pixels, matte, ground plane, cast shadow outside sprite, foundation, wall panels, gates, roof, stones, new structures or added objects. Keep the scattered existing rubble as shown. No text. The source wall's exact arrangement and map alignment are higher priority than style.

Walls 5–8 used this prompt with the original ratios 465:618, 465:574, 450:467, 421:569 and twice those canvas sizes:

Use case: precise-object-edit. Asset type: existing isometric game palisade sprite wall-{N}. Image 1 is the ONLY edit target. Images 2 and 3 are style/material references ONLY, never copy their architecture or objects. Reconstruct image 1 at high native resolution with genuinely new crisp wood detail. Target native canvas {TARGET} pixels or greater while preserving original {RATIO} aspect ratio exactly. {DESCRIPTION} Preserve original normalized canvas framing, padding, object size and position so existing game map placements remain aligned. Change only rendering resolution and timber appearance: match HQ weathered grey-brown oak, pale worn cut edges, dark subtle grain fissures and knots, restrained moss, crisp painted isometric game illustration. Preserve EVERY existing post, diagonal brace, rail, rope, broken tip, gap, rubble, curvature, perspective, silhouette and arrangement as closely as possible. Keep the exact original damage; do not repair or fill anything. Do not expand a cropped end. No foundation, no additional wall panels, no gates, no roofs, no buildings, no new objects, no ground plane or cast backdrop. Genuine transparent alpha background, no backdrop, no checkerboard pixels, no text or watermark. Empty areas remain transparent. This is a faithful detailed reconstruction of this exact wall, not a redesign and not a simple blurry enlargement.

Descriptions: wall 5 mostly empty upper half with curved lower wall and separated cropped left fragment; wall 6 long descending diagonal curved palisade from upper left to lower right, damaged sections/gaps and cropped right endpoint; wall 7 ascending curve from lower left to upper middle with cropped top-right segment and empty right side; wall 8 upper curved wall with cropped middle-left fragment and empty lower half.
