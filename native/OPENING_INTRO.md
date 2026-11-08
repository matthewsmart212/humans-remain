# iOS opening flow — The Reclamation

This Expo-only flow runs before the existing `NativeStartingScreen`:

1. A quiet, darkened title screen with the approved Humans Remain logo.
2. **Watch Intro** fades to the dedicated 60-second cinematic player. The movie plays once (including its own narrator/music), with **Skip** at top right. Completion or Skip fades into the existing menu.
3. **Continue** fades directly into the existing menu.
4. Returning from a run to the starting screen stays at the menu instead of returning to the intro choice.

The original looping `public/previews/dawn-camp/start-scene.mp4` remains the **main-menu background**, unchanged. This opening deliberately does not use it as a substitute intro.

## Add the final cinematic video

The user-created 60-second movie is not yet committed. Until connected, Watch Intro shows a helpful unavailable message and a Continue button; Continue works normally.

**Recommended for final offline iOS builds:** put the finished, sound-mixed H.264/AAC MP4 at:

```
public/previews/the-reclamation/intro.mp4
```

Then replace the source declaration in `native/OpeningFlow.tsx` with a static require:

```ts
const introSource:VideoSource=require('../public/previews/the-reclamation/intro.mp4');
```

Remove the URL-only declaration if no longer needed. Metro must see a literal static `require` for bundling; do not use a runtime-computed local file path.

**For remote video testing before bundling:** set `EXPO_PUBLIC_RECLAMATION_INTRO_URL` to a direct, publicly accessible HTTPS MP4 URL before starting Expo. The player uses streaming/caching where supported. Avoid GitHub's regular HTML blob pages: they are not playable video URLs.

A landscape 1920×1080 MP4, 30 fps, H.264 video + AAC audio, with speech and music mixed together, is a reasonable iPhone delivery format. Use a moderate bitrate to avoid excessive app size and decoding spikes.

## Verify on an iPhone

- Cold-launch in landscape; wait for the poster and logo; tap Continue. Existing expedition menu, menu music, character selection and Play should remain unchanged.
- Relaunch; choose Watch Intro. Confirm video audio, responsive Skip, and automatic main-menu transition when it ends.
- Put the app in the background during playback, then return. Playback should pause while inactive and resume when active.
- Test with Reduce Motion enabled in iOS Accessibility settings; screen transitions should become immediate.
- Test Watch Intro with no video URL/file, with a network error, and offline. The user must always be able to continue.
- Confirm gameplay return-to-title goes to the existing menu, not the initial Enter screen.
- Test on a real iPhone; this branch has not been device-tested.

The entry uses a single static poster instead of adding another looping video, reducing simultaneous decoding and asset pressure on iOS.
