import frames from './tree-shade-frames.json';
import type {World} from './survival-engine';
import {placementBounds,placementPoint,type Placement} from './world-layout';

export const TREE_SHADE_IMAGE='/survival/woodland-canopy-v1/shade.webp';
export const treeShadeFrames=new Map(Object.entries(frames));

/** Project each crown onto the soil at its own root. The sun direction stays in
 * world space when an editor flips a tree, and the shade fades with a falling crown. */
export function drawTreeShade(ctx:CanvasRenderingContext2D,sheet:HTMLImageElement,w:World,p:Placement,frame:number,daylight:number){
 let opacity=daylight;
 const chop=w.treeChops?.[p.id];
 if(chop?.hp===0){
  if(chop.felledAt==null||w.weather?.reducedMotion)return;
  opacity*=Math.max(0,Math.min(1,1-(w.tick/60-chop.felledAt)/.55));
 }
 if(opacity<=0)return;
 const [x,y]=placementPoint(p,p.x,p.y),width=placementBounds(p).width;
 ctx.save();
 ctx.globalAlpha*=opacity;
 ctx.drawImage(sheet,(frame%4)*224,Math.floor(frame/4)*112,224,112,
  x-width*.60,y-width*.25,width*1.42,width*.71);
 ctx.restore();
}
