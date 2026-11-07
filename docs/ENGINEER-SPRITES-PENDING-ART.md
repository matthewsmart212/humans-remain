# Engineer painted-sprite integration (staging branch)

This staging branch contains the full code integration but **does not yet include the binary artwork**. Do not merge it into main or deploy until these files are uploaded into `public/survival/engineer-v1/`:

- `front.webp` — 1256×1256, four directions and four frames per direction
- `rear.webp` — 1256×1256, four directions and four frames per direction
- `portrait.webp` — 280×280 preview

The full-resolution paint atlas package is supplied to the project owner separately. It removes the `drawEngineerIdentity` runtime overlay, preserves the original Survivor animation pipeline, and uses independent Engineer textures even in attack modes. Confirm the built iOS bundle loads the two Engineer WebP images offline. Complete build and native type checks before merging. The authored map and fresh-run behaviour are unchanged.
