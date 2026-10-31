import registered from '../public/survival/scrap-runner/axe-combo-v1/atlas.json';
import {facing,timeOf,type Direction,type World} from './survival-engine';
import {axePoseFrame,axeProfile} from './axe-combat';

export type RunnerAxeView='down'|'down-right'|'right'|'up-right'|'up';
type View=RunnerAxeView;
type Point=readonly [number,number];
type Art={cell:Point;anchor:Point;scale:number;columns:number;views:Record<View,{image:string;blade:Point[]}>;directions:Record<Direction,{view:View;mirror:boolean}>};
export const RUNNER_AXE_ART=registered as unknown as Art;
// Match register-runner-cycles.py: hair width 78, hair top -112. Atlas cells
// contain different-size drawings; a common cell/scale alone does not register
// the anatomy. Calibrate once from measured hair, never weapon/arm bounds.
// This registers the attack BODY/AXE. runner-combat-head replaces visible-face
// views with the original idle head at its untouched scale and foot anchor.
export const RUNNER_AXE_REGISTRATION=Object.fromEntries(registered.sources.map(source=>[
 source.view,source.frames.map(frame=>{
  const hair=frame.sourceHairBox,scaleX=78/((hair[2]-hair[0])*source.packingScale),scaleY=registered.scale;
  // Height/waist were already registered to the approved boots. Increasing
  // both axes would lengthen the coat over the legs: correct width only.
  return {scaleX,scaleY,x:-registered.anchor[0]*scaleX,y:-112-registered.layers.headTop*scaleY};
 })
])) as Record<View,{scaleX:number;scaleY:number;x:number;y:number}[]>;
export function runnerAxePoint(view:View,frame:number,point:Point):Point{
 const r=RUNNER_AXE_REGISTRATION[view][frame];return [r.x+point[0]*r.scaleX,r.y+point[1]*r.scaleY];
}
export const RUNNER_AXE_IMAGE_SOURCES:Record<string,string>=Object.fromEntries(Object.entries(RUNNER_AXE_ART.views).flatMap(([view,art])=>[['runnerAxe-'+view,art.image],['runnerWoodenAxe-'+view,`/survival/scrap-runner/wooden-axe-combo-v1/${view}.webp`]]));
export function runnerAxeFrame(w:World){
 const swing=w.axeSwing;if(!swing||w.player.downedUntil)return;
 const age=timeOf(w)-swing.started;if(age<0||age>=axeProfile(swing).duration)return;
 const direction=facing(Math.cos(swing.angle),Math.sin(swing.angle)),view=RUNNER_AXE_ART.directions[direction];
 return {...view,direction,key:(swing.tool==='woodenAxe'?'runnerWoodenAxe-':'runnerAxe-')+view.view,frame:axePoseFrame(swing,timeOf(w)),age};
}
