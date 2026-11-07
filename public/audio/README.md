# Humans Remain start-menu audio

Place the approved track at `public/audio/start-menu.mp3`.

- Source: **Piano Mystery – Tense Cinematic Drone Loop**, Sonican (Pixabay track 335499).
- Duration: 142.785 seconds.
- SHA-256 of the uploaded/approved MP3: `17204071aaf95ac09311ac03482fd30a1614dfe658e864adb6e1ebca15cab583`.
- Pixabay music page: https://pixabay.com/music/solo-piano-piano-mystery-tense-cinematic-drone-loop-335499/
- Used under the Pixabay Content License.

The GitHub Action in `.github/workflows/import-start-menu-music.yml` attempts to retrieve this exact asset automatically and verifies the SHA-256. If it fails, upload the original audio file to this folder and rename it `start-menu.mp3`. Web and native playback are already wired to that path (native via the public main-branch URL).
