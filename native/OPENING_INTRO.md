# iOS opening flow — The Reclamation

The native Expo entry now has a **single shared music player** for the introduction AND the existing start menu.

## Confirmed media

- Movie with narration: `public/previews/the-reclamation/intro.mp4`
- Continuous soundtrack: `public/previews/the-reclamation/soundtrack.mp3`

The original looping visual at `public/previews/dawn-camp/start-scene.mp4` remains the main-menu background, but `public/audio/start-menu.mp3` is **no longer played by the iOS menu**.

## User experience

1. App opens on the Humans Remain title screen.
2. **Watch Intro:** the app loads both local files, starts the video with narration, and starts the soundtrack when native video playback begins.
3. **Continue:** starts that same soundtrack and fades directly to the existing main menu.
4. **Skip Intro:** pauses ONLY the video, while the existing soundtrack continues at its current playback time during the fade to the menu.
5. **Intro ends:** the soundtrack continues without seeking/restarting, and the main menu appears.
6. The soundtrack loops for as long as the main menu remains visible; when Play finishes loading and the game itself becomes visible, the shared soundtrack player is released.
7. Opening the in-game pause menu and choosing Starting Screen opens the main menu with a fresh soundtrack instance.
8. The existing music toggle and saved mute preference still control the music in the start menu.

The audio session uses `expo-audio` with iOS silent-mode playback and mixes with the intro narration in `expo-video`. Since the track and the video are decoded by different native players, their start is approximate, with drift correction during cinematic playback; it isn't sample-perfect. For frame-perfect timing, combine the video narration and music in one MP4 audio track.

## iPhone QA

- Cold launch and choose Watch Intro: music should begin with the moving video (not earlier) and remain under voice-over.
- Skip at 5, 20 and 55 seconds: video stops; music must *not* restart or silence during the transition.
- Let the video complete: music continues in the expedition menu, looping as needed.
- Choose Continue directly: music begins and continues in the expedition menu.
- Test the sound/music toggle: mute and unmute should affect the shared soundtrack.
- Background during the intro and menu; media should pause while inactive and resume correctly.
- Press Play and wait for world load: menu music should stop only once gameplay is actually entered.
- Test on a physical iPhone; passing GitHub typechecks does not confirm AV playback behaviour.

## Four-second cinematic-to-menu UI entrance

The final 4 seconds of the user's intro share the same artwork as the animated menu background. The game now uses the same actual menu UI during those seconds — no duplicate artwork or second set of menus:

- At **4.0 seconds remaining**, the existing Humans Remain logo begins easing into place.
- Around **3.0 seconds remaining**, the survivor portrait, name, class and experience bar rise softly into view.
- Around **2.1 seconds remaining**, the expedition/menu cards begin sliding up and fading into the actual interactive positions.
- During the **final 1.5 seconds**, the music/settings controls and translucent UI shading settle in.
- The menu UI component stays mounted and its controls only become interactive after the video handoff. The intro's final frame fades into the prepared start-scene.mp4 loop beneath those already-positioned UI elements.

Implementation:
- `native/MenuBackdrop.tsx`: a single persistent, independently controlled `expo-video` menu loop behind the intro.
- `native/OpeningFlow.tsx`: triggers the UI entrance from the intro video's **remaining playback time**, and cues the loop at the final ~0.12 seconds.
- `native/EntryFlow.tsx`: keeps the same UI over the intro and menu, disables touches during cinema and preserves the shared music.
- `native/StartingScreen.tsx` and `src/StartingScreen.tsx`: transparent UI-only menu with staggered native-driver animations. Web remains unchanged unless explicit intro phases are requested.

The entrance is suppressed when iOS Reduce Motion is enabled. Continue and Skip show the complete menu without waiting for the four-second reveal. The real film-to-loop visual handoff still needs a physical-iPhone check; TypeScript checks alone cannot measure decoder frame timing.
