# Humans Remain starting screen

Browser: the editor's Play button opens the animated survivor hub. Play in the
hub restores the existing Survival save through the normal preparation flow.
`#start` and a fresh `#game` visit enter the hub. Leaving Play opens the hub;
World editor returns to the retained draft.

Expo/iOS: the app opens directly into the hub. The gameplay component and its
world renderer mount after Play. The pause menu can save and return to the hub.
After pulling this update, run `npm install` in `native` once for `expo-video`,
then restart Metro. The SDK-compatible module is included in Expo Go.

Both platforms share the menu layout, responsive typography, portrait, illustrated
Humans Remain wordmark, name and level/XP bar. The approved 16-second camp video
keeps its fire, tree and character timing unchanged. The browser streams the
immutable approved GitHub clip with a local lossless poster. The native clip is
bundled for offline playback. Native
playback uses expo-video; it pauses in the background and releases on leaving
the hub. Reduced motion and the saved animation preference pause the scene.
The static poster remains available while media prepares.

Customise stores a device-local survivor name. Settings stores animation on/off.
Play with Friends is disabled and marked Coming soon. Upgrades explains the
existing Headquarters/Camp Plans path and provides entry to camp; it does not
spend resources or alter the save. Outfits remain future content. Level 1 and
0/1,000 XP are the initial display; this screen adds no XP award/levelling system.
No example Level 7 / 640 XP values or invented player progress are saved.

The existing survival-save key and format are unchanged. The separate profile
key is `humans-remain-survivor-profile-v1`.

Validation: web and native TypeScript checks; Expo iOS production export with
bundled movie/poster; web production build. Browser QA covers profile editing,
settings, disabled multiplayer, editor entry and the Play transition. Native
export verifies packaging; physical iPhone runtime/FPS remains untested here.

## Approved UI artwork, November 4

The starting-screen UI now follows the approved compact wordmark and right-hand
menu composition. It uses a transparent weathered cream/orange logo, semantic
Play/group/jacket/upgrade-book icons, a cream outline settings cog, an amber
selection glow, and a borderless survivor cutout. The supplied reference and
original generated masters are retained under `art-source/starting-screen-ui-v2`.
Production PNGs under `public/survival/starting-screen-ui-v2` are shared by web
and Expo; the 48-unit vector icon definitions remain in `src/start-screen-icons.ts`.

Both platforms use the same bundled CampMenu face, a static semibold instance
of the SIL-OFL Cinzel typeface, with its license in `public/fonts/camp-menu-OFL.txt`.
Expo waits for the local face before revealing the menu and falls back gracefully
if font loading fails. The logo and icons use small static textures; this adds
no gameplay drawing or animation work. The menu keeps the approved camp movie
and its timing. Existing identity, actual initial Level 1 / 0 XP display, saves,
entry points, disabled multiplayer and menu actions are preserved.

The editor action moves above the profile on portrait browsers. Status notices
use their own area so they cannot overlap the footer on short landscape screens.
