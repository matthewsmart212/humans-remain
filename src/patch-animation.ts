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
};
const cell=PATCH_ROBOT_CELL;
const damaged:PatchSpriteFrame={image:'patchDamaged',source:[0,0,cell,cell],lamp:PATCH_DAMAGED_LAMP,row:0,phase:0};
const idle:PatchSpriteFrame[]=PATCH_ROBOT_LAMPS.map((lamp,row)=>({image:'patchRobot',source:[row%4*cell,Math.floor(row/4)*cell,cell,cell],lamp,row,phase:0}));
// Each heading owns a complete gait row. Selecting a new heading only changes
// the row, never the phase, so turns do not repeatedly plant the same foot.
const walk:PatchSpriteFrame[][]=walkFrames.lamps.map((lamps,row)=>lamps.map<PatchSpriteFrame>((lamp,phase)=>({image:'patchWalk',source:[phase*cell,row*cell,cell,cell],lamp:[lamp[0],lamp[1]],row,phase})));

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
