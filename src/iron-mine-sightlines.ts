export const MINE_CHAMBER_MASK = 'scene:iron-mine:chamber-masks:v1';
const frameWidth = 450;
const frameHeight = 340;

/** Beyond the common haulage hall, each drift sees only its own side of the
 * rock pillars. The mask is in survey coordinates so zoom, menu pans, co-op
 * actors and world-space highlights all obey the same sightline. */
export function drawMineSightlines(
  ctx: CanvasRenderingContext2D, mask: HTMLImageElement,
  player: {x: number; y: number}, width: number, height: number,
) {
  // The floor divides into three disconnected necks at this depth.
  const depth = Math.min(1, Math.max(0, (player.y - 1060) / 135));
  if (depth === 0) return;
  const chamber = player.x < 1100 ? 0 : player.x < 2180 ? 1 : 2;
  ctx.save();
  ctx.globalAlpha *= depth * depth * (3 - 2 * depth);
  ctx.drawImage(mask, chamber * frameWidth, 0, frameWidth, frameHeight, 0, 0, width, height);
  ctx.restore();
}
