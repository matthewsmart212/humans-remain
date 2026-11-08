# iOS opening flow — The Reclamation

The iOS Expo application now starts on a cinematic title screen with the existing Humans Remain logo:

1. **Watch Intro**: fade in to the 60-second video, then fade to the existing start menu.
2. **Continue**: go straight to the existing start menu.
3. During the cinematic, **Skip** immediately stops *both* the video and its separate MP3 soundtrack.
4. After the video ends, the player enters the normal menu. Returning from gameplay also goes to the menu, not back to the Enter screen.

The existing menu's looping `public/previews/dawn-camp/start-scene.mp4` and `public/audio/start-menu.mp3` remain separate and unchanged.

## Replace the video and soundtrack

The following real files MUST replace the tiny binary placeholders committed here:

| File | Exact repository path |
| --- | --- |
| 60-second finished intro video (includes narration, no background music required) | `public/previews/the-reclamation/intro.mp4` |
| Music bed, 60 seconds and starting at time zero | `public/previews/the-reclamation/soundtrack.mp3` |

**Open the folder in GitHub:**
https://github.com/matthewsmart212/humans-remain/tree/main/public/previews/the-reclamation

You do NOT need to update code or create another branch when replacing these placeholders. GitHub stores these specific files as ordinary Git blobs (rather than LFS pointers) to allow replacement from GitHub's web UI. For files too large for the GitHub UI (normally 25 MiB per file), use Git from your computer with an appropriate large-file strategy, or re-encode the video at a smaller bitrate. The audio and video will be statically bundled by Expo and playable offline.

**Important:** the repository initially contains a deliberately *1-second, tiny, blank placeholder video* and a very short silent MP3. Watch Intro will display an "intro not installed yet" message until you replace them with the real media. Both files need replacing. Do not mistake these placeholders for your finished cinematic.

### Video settings

Use landscape 16:9, H.264/AVC MP4, 1920 × 1080 (or 1280 × 720), 30 fps and roughly 60 seconds. Include your spoken narration (and optional sound effects) in the video file. **Do not mix the same background music into the video** if you also put that music in `soundtrack.mp3`, or you'll hear it twice.

Use a 60-second MP3 for the soundtrack. Its first beat should begin at 00:00, with no extra lead-in silence unless intentional. You can fade out the music in the last second for a clean transition to the existing menu track.

## Playback implementation

- `native/OpeningFlow.tsx` statically loads `intro.mp4` with `expo-video`, and `soundtrack.mp3` with `expo-audio`.
- The soundtrack is preloaded; the video does not start until both sources are ready.
- Music starts on the video's native `playingChange(true)` event rather than an arbitrary button-tap timer.
- When paused or backgrounded, both pause. When playback resumes, the MP3 seeks to the current video time.
- During playback, the controller corrects drift larger than 0.45 seconds, and both stop on Skip or video completion.
- The video contains the narration and the separate music player only contains background music.
- Exact sample-level synchronization is **not guaranteed** with separate native video/audio players. For absolutely precise sync, mix the completed MP3 into the final MP4 as one AAC audio track and play the video alone. Keeping the MP3 separate offers convenient replacement and approximate syncing.

## Testing

1. `cd native && npx expo start` on the new main commit.
2. Verify Continue opens your existing menu with its previous music and moving backdrop.
3. Replace **both** media files, refresh Metro, tap Watch Intro and check the music begins with the video.
4. Skip at 5 seconds, ensure no intro audio continues underneath the menu.
5. Let the 60-second video finish; it should switch to the menu automatically.
6. Background and restore the app midway through video, then test headphones, mute, slow loading, iOS Reduce Motion, and return-to-menu.
7. Test on a physical iPhone. GitHub type checks do not validate native playback timing.

The static splash uses a dimmed copy of the existing menu poster so the game doesn't decode multiple looping videos on first launch.
