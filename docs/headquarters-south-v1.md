# South-facing headquarters

The existing timber hall now faces directly south at the northern centre of the
camp palisade. The wall artwork and placements are unchanged. The original
workshop and furnace move a short distance southwest to clear the new frontage;
only their reviewed original placements move. A one-time layout version prevents
subsequent editor adjustments from being overwritten.

## Artwork

Four transparent 1536 × 1024 WebP assets live in
`public/survival/headquarters-south-v1/`: repaired exterior, repaired interior,
ruined exterior and ruined interior. Built-in ImageGen produced the artwork;
runtime exports preserve its alpha and use quality 94 WebP. All four are included
in the offline native bundle. The existing chest, planning table and supporting
props are retained as separate interactive objects.

The replacement applies to the reviewed headquarters upload pair only. Later
owner-uploaded art keeps priority. Shared collision, foreground drawing and roof
visibility use the new floor geometry. The roof pass ends above the steps so it
cannot draw stairs over a survivor. The interior's rear-wall depth places it in
front of the palisade while keeping the floor behind people and furniture.

## Prompt set

- Repaired exterior: recreate the headquarters from the supplied game screenshot
  as the same broad weathered timber hall, facing precisely south in elevated
  orthographic front view. Horizontal ridge, eaves and steps; no diagonal turn.
  Mossy stone foundation, dark grey brown timber, shingle roof with corrugated
  repairs, right chimney, two windows, open central entrance, left crates/sacks
  and right wood store/churn. Transparent backdrop; no people, terrain or UI.
- Repaired interior: retain the same canvas and front foundation, windows,
  entrance and steps. Remove roof and chimney, reveal an empty rectangular plank
  floor and rear/side walls. Keep a continuous unobstructed floor from the steps
  through the doorway to the rear wall. No internal wall in the entrance.
- Ruined exterior: preserve orientation, canvas, foundations, doorway and step
  positions; add roof holes, snapped rafters and split planks. Keep entrance and
  steps usable, with loose boards confined to the edges.
- Ruined interior: preserve the repaired cutaway geometry and large walkable
  floor; add missing wall planks, chipped beams and a little debris at the edges.
  Keep the broad central aisle clear for four characters. No roof or chimney.

## Verification

`node scripts/check-south-headquarters.mjs` checks the actual shared collision and
navigation code, fixed image dimensions/alpha, offline bundle entries, later art
uploads, one-time migration, retained wall placements and continued-run state.
It also renders repaired/ruined exteriors and cutaway interiors with four actual
worker sprites. Evidence is under `docs/qa/headquarters-south-v1/`.

The usable interior rectangle is approximately 1016 × 355 world units at the
camp's existing 1.8 scale. Four clear standing positions are more than 80 units
apart, and a 64-unit central aisle connects the steps to the rear. The table and
all four positions are reachable. The player collision diameter is 38 units.

Additional checks: root/native TypeScript, first expedition (including three
night raids and save/reload), on-site repairs and building restoration. Web
production build passes. No physical iPhone test was performed. Automatic
approval review blocked Expo's iOS export because it could contact Expo and send
project/build data; that export is not recorded as verified.
