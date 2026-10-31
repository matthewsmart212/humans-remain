These exports were already excluded by scripts/build-checklist-server.mjs and
redirected by server/checklist.ts in deployed v144. They are preserved here,
outside public, so future builds cannot accidentally republish the superseded
terrain and planning images. Current terrain, roads, river and guide assets are
unchanged. Relative folders preserve each former public URL.
