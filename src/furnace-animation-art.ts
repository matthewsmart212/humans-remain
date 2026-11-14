export const FURNACE_ART_ROOT='/survival/camp-furnace-v3';
export const FURNACE_ACTIVE_FRAMES=Array.from({length:16},(_,index)=>`${FURNACE_ART_ROOT}/active-${String(index).padStart(2,'0')}.webp`);
export const FURNACE_COLD_IMAGE=`${FURNACE_ART_ROOT}/cold.webp`;
export const FURNACE_BROKEN_IMAGE=`${FURNACE_ART_ROOT}/broken.webp`;
export const FURNACE_ANIMATION_FPS=25/6;
