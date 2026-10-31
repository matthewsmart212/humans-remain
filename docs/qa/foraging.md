# Wild food foraging — 25 October 2026

The authored-world upgrade adds 48 berry bushes and 18 apple trees without moving existing placements. Plants occur in small woodland patches, with starter bushes near spawn and rarer apple groves beyond camp. A version marker keeps the pass idempotent and preserves subsequent editor removals.

Picking uses the existing action hex, shows the relevant food icon, and collects exactly one berry portion or one apple per tap. Remaining fruit stays visible. Short cooldowns and press/release capture prevent held or duplicated taps from clearing a plant. A full backpack leaves the fruit intact. Bushes hold four berry portions; trees hold three apples. Ripe plants have nearby fruit/count badges above their crowns, with a gold ground highlight and a brighter PICK 1 marker on the current target. Empty plants lose their ripe-food badges. Markers reuse the existing fruit art, keep their screen size through zoom, and respect wall cover.

A fully picked bush regrows after two dawns; an apple tree after three. Partial harvests preserve their remaining fruit. Plant state lives in the current run; starting another run resets it. A picked neighbour cannot hide a nearby ripe plant. Loose pickups and camp stations retain interaction priority.

Sprites remain registered at one fixed size; ripe fruit uses the existing inventory art as a separate layer. Harvesting causes a brief shake and gather arc. Idle plants do not animate. The renderer, spatial query, inventory controller and day-based regrowth are shared with native; the new bases are bundled for offline native loading.

Assets created with the built-in image generator:

- `public/survival/forage-v1/berry-bush.png`
- `public/survival/forage-v1/apple-tree.png`

Style references were the existing `foliage-v4/berry-bramble.webp` and `trees-v2/oak.webp`. The prompt set requested isolated transparent painterly woodland props, elevated three-quarter game perspective, warm bark, subdued olive/moss/yellow-green leaves, top-left light, no labels, terrain tiles or baked fruit. The bush brief requested a dense waist-high, three-lobed, serrated-leaf bramble. The tree brief requested a small wild apple tree with an irregular spreading crown, short gnarled trunk and visible roots. Fruit is deliberately drawn by the game so ripe and harvested silhouettes match exactly.

Validation:

- `npm run typecheck`
- `node scripts/check-foraging.mjs`: all 66 plants accessible; map conservation, version preservation/idempotence, near-spawn discovery, action locks and stale actions, line of sight, inventory/partial/full-pack conservation, duplicate-tap protection, neighbour selection, day-based regrowth, apple food/water effects and new-run reset.
- Existing food provision, food integration and bow lock-on regression checks passed.
- Browser exercise at `scripts/foraging-qa.html`: real authored world and Skia renderer in 390 × 700 portrait and 844 × 390 landscape viewports; picked berries/apples one at a time through the actual HUD, checked full-pack disabling and fruit retention, then stepped dawns to confirm visible regrowth. No cloud writes. Physical iPhone build not run.
