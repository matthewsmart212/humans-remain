# Headquarters terrain texture blend

The broad soil artwork previously covered the map texture with an opaque dark patch. It now draws at 36% opacity, letting the existing terrain's stones, leaves and warm colour continue through the disturbed ground. Its irregular alpha edges become less conspicuous against the surrounding map.

Only the broad ground dressing is translucent. The weathered footing, corner foliage, stairs, building and interior retain their normal opacity. A scoped save/restore prevents the blend from affecting later drawing. The shared renderer uses the existing native image paint; there are no additional images, texture allocations, shaders, offscreen surfaces or draw passes.

No asset images, world placements, scale, collision, furniture or saved games change.

Validation: TypeScript, the existing headquarters doorway/navigation checks, offline production native rendering of both repaired and ruined halls through twenty entrance positions, and production web build. Native render captures and reports are in `docs/qa/headquarters-terrain-v7/`. No physical iPhone test was available.
