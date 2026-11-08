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
