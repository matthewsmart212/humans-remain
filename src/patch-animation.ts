import {PATCH_DAMAGED_LAMP,PATCH_ROBOT_CELL,PATCH_ROBOT_FRAMES,PATCH_ROBOT_LAMPS,PATCH_WALK_CYCLE_DISTANCE,PATCH_WALK_PHASES} from './patch-art';
import walkFrames from './patch-walk-frames.json';
import type {Direction} from './survival-engine';

export type PatchSpriteMode='damaged'|'idle'|'walk';
export type PatchSpriteFrame={
 readonly image:'patchDamaged'|'patchRobot'|'patchWalk';
 readonly source:readonly [number,number,number,number];
 readonly lamp:readonly [number,number];
 readonly row:number;
 readonly phase:number;
 readonly registration:readonly [scale:number,offsetX:number,offsetY:number];
};
const cell=PATCH_ROBOT_CELL;
// Align each painted gait row to the planted pose in that heading. Across
// its eight frames we match median silhouette height, the ground line and
// the weighted horizontal centre of the chassis (65%) and feet (35%).
// One isotropic transform per heading preserves the authored leg movement.
const planted=[1,0,0] as const;
const gaitRegistration=[
 [.9679,-3.55,-2],[.9679,-7.95,-1.52],[.9849,1.11,-2],[1.0208,-19.23,-2],
 [.9608,-.18,-2],[.9849,7.37,-2.49],[.9727,-7.53,-2],[.9751,3.7,-2],
] as const;
const damaged:PatchSpriteFrame={image:'patchDamaged',source:[0,0,cell,cell],lamp:PATCH_DAMAGED_LAMP,row:0,phase:0,registration:planted};
const idle:PatchSpriteFrame[]=PATCH_ROBOT_LAMPS.map((lamp,row)=>({image:'patchRobot',source:[row%4*cell,Math.floor(row/4)*cell,cell,cell],lamp,row,phase:0,registration:planted}));
// Each heading owns a complete gait row. Selecting a new heading only changes
// the row, never the phase, so turns do not repeatedly plant the same foot.
const walk:PatchSpriteFrame[][]=walkFrames.lamps.map((lamps,row)=>lamps.map<PatchSpriteFrame>((lamp,phase)=>({image:'patchWalk',source:[phase*cell,row*cell,cell,cell],lamp:[lamp[0],lamp[1]],row,phase,registration:gaitRegistration[row]})));

/** Ground distance, not elapsed time, drives the essential leg movement.
 * Reduced motion keeps these steps; it only suppresses decorative effects.
 */
export function patchWalkPhase(distance:number){
 const travelled=Number.isFinite(distance)?Math.max(0,distance):0;
 return Math.floor((travelled%PATCH_WALK_CYCLE_DISTANCE)/PATCH_WALK_CYCLE_DISTANCE*PATCH_WALK_PHASES);
}
/** Idle immediately uses planted feet while preserving the run's gait phase. */
export function patchSpriteFrame(mode:PatchSpriteMode,direction:Direction,distance=0):PatchSpriteFrame{
 if(mode==='damaged')return damaged;
 const row=PATCH_ROBOT_FRAMES[direction];
 return mode==='walk'?walk[row][patchWalkPhase(distance)]:idle[row];
}
