# Circular wall kit: final visual review

**Verdict: accepted for the standalone 16-piece asset kit, with the minor caveats below.** All 16 actual sprite joins were inspected. This does not certify live-game integration or a pixel-perfect painted circumference.

## Reviewed output

- Actual assembled PNG: `artwork-archive/circular-wall-kit-v1/previews/assembled-circle.png`.
- Assembly: 4834 × 5082 px at 1.4 pixels per world unit.
- Assembly SHA256: `9c7a647e1294cf9205d82823d3ab1fd6af2cdc8b3b54ef577e9032623105e3c9`.
- Every final PNG, lossless WebP and untouched selected ImageGen source is individually bound by path, dimensions and SHA256 in `visual-review.json`.
- The review used the actual independently registered sprites. The clay guide ring was not substituted for an artwork assembly.
- All 16 joins were inspected at native pixel resolution. After the last corrections, both joins adjacent to 04, 12 and 16 were checked again, along with the northern 01→02 ordering guard. The other 13 sprite files retained their previously reviewed hashes.

## Overall appearance

The sharpened, uneven oak, rough low masonry and moss are consistent across the ring. The northern half shows the camp-facing rails; the southern half shows the outside plank faces. The supplied placement closes the circular ground footprint. Each part is orientation-specific.

## All 16 joins

| Join | Result | Observation |
|---|---|---|
| wall-01 → wall-02 | Accepted | One owned joint post covers the overlap; the rails and mossy base read continuously. Rechecked after the northern draw-order change. |
| wall-02 → wall-03 | Accepted | Continuous stone and timber join; one coherent structural post, with natural variation in nearby picket heights. |
| wall-03 → wall-04 | Accepted | Rechecked after wall-04 revision. Oblique pickets partly overlap the post at this steep view, but the foundation and rails remain continuous. |
| wall-04 → wall-05 | Accepted; minor caveat | Rechecked after revisions to wall-05 and wall-04. The large square inner end cap is reduced and beveled. A local inner silhouette jog of about 11.9 assembly pixels remains at ground Y=0; this is a visible rough stone edge, with no full-depth transparent gap. |
| wall-05 → wall-06 | Accepted | Rechecked with revised wall-05. Its extra far-end painted post is hidden by wall-06 in the reviewed assembly; only one joint post reads visibly. This depends on the supplied placement/order. |
| wall-06 → wall-07 | Accepted | A single coherent joint post and continuous stone footing; no obvious daylight gap or duplicate structural post. |
| wall-07 → wall-08 | Accepted; minor caveat | Timber closes cleanly. Individual stones produce a small irregular lower-edge step beside the joint post, consistent with the rough masonry style. |
| wall-08 → wall-09 | Accepted | The south join closes with one front post and a continuous, gently curved stone base. |
| wall-09 → wall-10 | Accepted; minor caveat | The stone base closes. Near pickets partly occlude the following post/collar at the angled exterior view; no second iron-banded post is visible. |
| wall-10 → wall-11 | Accepted; minor caveat | The foundation is continuous. Angled near pickets cover part of the following structural post; this remains a visible occlusion caveat at full asset resolution. |
| wall-11 → wall-12 | Accepted; minor caveat | Rechecked after wall-12 revision. The preceding pickets hide much of the joining post collar at the steep side view, but there is no through-gap or additional iron-banded post. |
| wall-12 → wall-13 | Accepted; minor caveat | Rechecked after wall-12 revision. The extra endpoint iron-banded post is gone. Ordinary near pickets still partly cover wall-13's starting post, and a small inner stone corner remains visible; no double collar or full-depth gap remains. |
| wall-13 → wall-14 | Accepted; minor caveat | The base is continuous; an ordinary near picket partially covers the joint post at the steep angle. The camp-facing rails remain coherent. |
| wall-14 → wall-15 | Accepted; minor caveat | Rails meet behind the joint post. The stone silhouette has an irregular individual-block step, not a full-depth break. |
| wall-15 → wall-16 | Accepted | Rechecked after the draw-order constraint and wall-16 revision. Drawing wall-16 after wall-15 restores the whole starting post and iron collar; both rails terminate plausibly at it. |
| wall-16 → wall-01 | Accepted | Rechecked after wall-16 foundation revision. The former rectangular lower-base step at the north closure is gone; the starting post and both rails remain coherent. |

Native-resolution evidence files are `previews/qa-final-join-01-02.png` through `previews/qa-final-join-16-01.png`.

## Corrections verified

- **04→05:** the two local footing revisions reduced the initial conspicuous square inner cap. A small bevel/stone jog remains, quantified below.
- **12→13:** wall-12 now has ordinary terminal pickets instead of the extra banded endpoint post; the doubled iron collar is gone.
- **15→16:** the local draw-order correction exposes wall-16’s complete start post and collar, with plausible rail termination.
- **16→01:** the revised terminal foundation removes the former rectangular lower-base step at the north closure.

## Remaining visible caveats

The 04→05 inner stone contour is still not perfectly smooth. At the shared ground Y=0 plane, with alpha threshold 16, wall-04’s inner edge is 2249.1983 pixels and wall-05’s is 2261.1089 pixels relative to the assembly origin. The difference is 11.9106 pixels at 1.4 pixels per world unit; roughly 104 pixels of the wall depth still overlap, so this is not a transparent breach. The residual reads as an irregular beveled stone edge and is accepted for this deliberately rough style.

At the steep 03→04, 09→10, 10→11, 11→12, 12→13 and 13→14 views, near pickets obscure parts of the adjacent post faces/collars. Other joins have small individual-stone edge steps and slight natural rail-height variation. Whole-sprite ordering does not reproduce a full per-pixel 3D depth buffer.

Wall-05 contains a fourth terminal painted post in its isolated source. Wall-06 hides it in the reviewed ring. It must not be assumed to work as an exposed end piece or road opening without a separate variant and review.

## Aspect warnings

| Piece | Relative aspect change | Judgment |
|---|---:|---|
| wall-04 | -11.08% | Reviewed the original, registered side-view sprite and both adjacent actual joins after correction. The narrow orientation remains plausible. Nonuniform fit is real; the residual small foundation jog is documented separately. |
| wall-05 | -17.28% | Reviewed original, registered sprite and actual adjacent joins. The largest nonuniform fit narrows the image relative to its height, but the side-view timber remains visually coherent. The far-end fourth painted post is hidden only in the reviewed assembly. |
| wall-12 | -14.21% | Reviewed revised original, registered sprite and both adjacent actual joins. The extra far-end banded post was replaced by ordinary pickets; the previous doubled collar is resolved. Narrow side-view proportions remain plausible despite the nonuniform fit. |

These are real nonuniform bounding-box fits. Visual acceptance retains the warnings; it does not imply uniform scaling or prove that every painted internal feature matches the analytical guide.

## Placement and review limits

- Use the fixed anchors and 1.4 pixels-per-world-unit scale, with rotation 0 and no mirroring.
- Reviewed order: wall-15, wall-16, wall-01, wall-02, wall-03, wall-14, wall-04, wall-13, wall-12, wall-05, wall-06, wall-11, wall-07, wall-10, wall-08, wall-09.
- The nominal radius is 1650 world units, thickness 80, with 16 sectors of 22.5 degrees. These geometric quantities describe the ground footprint; the intentional irregular timber and stone outlines remain organic.
- The kit contains a complete closed ring. The six camp road openings, shortened ends and gates remain separate future work.
- Live layout, gameplay collisions, player occlusion and runtime performance have not been tested or changed by this art review. Nothing was deployed.

## Source and evidence files

- `visual-review.json`: exact review state, 16 join results, measurements and all reviewed-file hashes.
- `registration-report.json`: dimensions, fit ratios, alpha checks, encoding checks and actual assembly metadata.
- `geometry/manifest.json`: exact circular anchors, endpoints and post-ownership model.
- `camp-fit-audit.md` and `camp-fit-audit.json`: camp centre, clearance and future road-opening requirements.
