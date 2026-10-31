import type {Direction,Enemy} from './survival-engine';
import {DIRECTION_ANGLES} from './survival-engine';
import {SKITTER_LASER} from './skitter-model';
import data from '../public/survival/skitter-v1/atlas.json';
type Atlas={cell:number[];anchor:number[];directions:Record<Direction,{image:string;mirror:boolean}>;eyes:Record<string,number[][][]>};
const atlas=data as unknown as Atlas;
export const SKITTER_CELL=384,SKITTER_ANCHOR=[192,320] as const,SKITTER_DISPLAY=145,SKITTER_STRIDE=16;
const key=(image:string)=>'skitter-'+image.split('/').at(-1)!.replace('.webp','');
export const SKITTER_IMAGE_SOURCES:Record<string,string>=Object.fromEntries([...new Set(Object.values(atlas.directions).map(v=>v.image))].map(image=>[key(image),image]));
export function skitterView(direction:Direction){const v=atlas.directions[direction];return {key:key(v.image),mirror:v.mirror}}
export function skitterEyes(direction:Direction,frame:number){const source=atlas.directions[direction].image.split('/').at(-1)!.replace('.webp','');return atlas.eyes[source]?.[frame]??[]}
export function skitterFrame(e:Enemy,t:number){
 const m=e.motion,age=m?t-m.since:0;
 if(m?.phase==='stagger')return t-m.hitAt<SKITTER_LASER.stagger*.55?8:9;
 if(m?.phase==='windup')return 4;
 if(m?.phase==='strike')return age<SKITTER_LASER.fire*.6?5:6;
 if(m?.phase==='recover')return age<SKITTER_LASER.recovery*.8?7:0;
 return e.moving?Math.floor((e.walkDistance||0)/SKITTER_STRIDE)%4:0;
}
/** Measured visible lens or its hidden forward attachment for rear views. */
export function skitterEmitter(e:Enemy,frame=4){
 const direction=e.motion?.direction??'down',eye=skitterEyes(direction,frame)[0],mirror=skitterView(direction).mirror?-1:1,k=SKITTER_DISPLAY/SKITTER_CELL;
 if(eye)return {x:e.x+(eye[0]-SKITTER_ANCHOR[0])*k*mirror,y:e.y+(eye[1]-SKITTER_ANCHOR[1])*k};
 const a=DIRECTION_ANGLES[direction];return {x:e.x+Math.cos(a)*16,y:e.y-SKITTER_LASER.height+Math.sin(a)*16};
}
