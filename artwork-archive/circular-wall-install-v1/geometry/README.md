# Circular wall installation geometry

These geometric guides adapt the approved 16-part wall to the six existing camp roads. They are not painted game sprites. Run from the repository root with `node artwork-archive/circular-wall-install-v1/geometry/build-guides.mjs`; an optional first argument selects the original kit's geometry directory when it lives in another checkout. Node requires `sharp` and `@napi-rs/canvas`.

The guide canvases retain each original sector's 1536-square crop centre and 1.4 pixels per world unit registration. Ground projection remains circular at radius 1650, with 80-unit foundation depth and upright timber. Eleven guides are shortened; 01,04,05,13 and16 are exact copied originals. All original 7.5-degree grid posts are retained unless they would overlap a new road-end post. New cut ends receive full 49-unit posts. The nominal intervals and enlarged collision endpoint allowances are recorded separately.

The exact geometry source is the accepted kit at GitHub commit 16bce936604162fe8de8abd1a3e4fea58f6c69d9. Existing terrain, road traces and building positions are unchanged. The new collision paths have 34 points each, within the game's 64-point limit. Verify painted road variants in the actual sprite assembly and game before deployment.
