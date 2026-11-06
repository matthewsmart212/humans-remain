# Survivor preparation v4

The game displays one character, not two overlapping full-body pose images.

- Image: `survivor-prepare.webp`, 2520×3024 RGBA WebP, 7 columns by 6 rows.
- Sprite cells: 360×504 source pixels; 42 frames at 65ms per frame.
- Scene registration: 1536×864, world-space boot baseline (497,755).
- Rendered viewport: 400×560 units; feet at frame y=534.
- All frames retain 20+ pixels of headroom; no alpha bounding boxes reach left/right edge.
- Source art: original seated survivor from the existing `public/previews/dawn-camp/assets/survivor-idle-8.png` plus detailed intermediary preparation poses.
- Foreground video contains a baked seated character. Retain the transparent clean layer `start-prepare-v2/remove-seated-survivor.png` over that portion of the video during loading.
- Completion is a separate event from game readiness: do not enter the game until this clip's last frame is displayed AND the game world is ready.
- Reduced motion jumps to the final pose and signals completion; image-load errors must never trap players in the start screen.

Static-inbetweens are reconstructed from source poses and mesh-deformed without full-image crossfades, reducing duplicate limbs and translucent ghosts. The remaining limitations are those of drawn 2D keyframes, not a rigged 3D or Spine animation.
