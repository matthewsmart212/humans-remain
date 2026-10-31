# Backpack refresh

Only positive carried stacks appear in the shared inventory model. The starting axe remains available. The web and native quick bars also hide meals with zero portions. The field canteen, sip action, refill behavior and carried water weight have been removed; the camp well restores water directly and cannot be used remotely.

The backpack uses a compact illustrated grid with no category menus or blank item tiles. A selected item shows a short description, weight and actions. Food has prominent food and health gains: chicken +35/+8, rabbit +25/+6, wild meat +50/+12. Raw items show the same cooked result with an explicit “after cooking” label and cooking time. Benefits come from the actual recipes. Current health, food and water stay visible. Eating remains capped and cooldown protected.

When a selected stack disappears through eating or dropping, the detail view falls back to another carried food or the starting axe. The scrollable item area and detail area are bounded within the viewport; close controls stay outside those areas. Native uses the same inventory model and follows the same layout.

Checks: web/native typechecks; real web/native item handlers and selection fallback; backpack drop/recollect, weights and cooking regression; expedition well access/capacity checks; day/night and campfire experience checks. Browser preview observation was blocked by the environment's browser access policy. No browser or physical-device visual verification is claimed.
