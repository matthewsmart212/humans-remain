import type {Direction,Enemy} from './survival-engine';
import {WALKER_ATTACK} from './combat-model';
import data from '../public/survival/scrap-walker-v3/atlas.json';

type WalkerAtlas={cell:number[];anchor:number[];idleFrame:number;walkFrames:number[];directions:Record<Direction,{image:string;mirror:boolean}>;eyes:Record<string,number[][][]>};
const atlas=data as unknown as WalkerAtlas;
const key=(image:string)=>'walker3-'+image.split('/').at(-1)!.replace('.webp','');
export const WALKER_IMAGE_SOURCES:Record<string,string>=Object.fromEntries([...new Set(Object.values(atlas.directions).map(view=>view.image))].map(image=>[key(image),image]));
export const WALKER_CELL=atlas.cell[0],WALKER_ANCHOR=atlas.anchor,WALKER_DISPLAY=215,WALKER_STRIDE=24;
export function walkerView(direction:Direction){const view=atlas.directions[direction];return {key:key(view.image),mirror:view.mirror}}
export function walkerEyes(direction:Direction,frame:number){
 const source=atlas.directions[direction].image.split('/').at(-1)!.replace('.webp','');
 return atlas.eyes[source]?.[frame]??[];
}
// Measured orange knuckle centres in anticipation, contact and follow-through.
// Mirrored headings use the same registration as the painted atlas.
const FISTS:Record<string,readonly (readonly [number,number])[]>={
 down:[[267,143],[263,200],[118,233]],
 'down-left':[[275,130],[92,226],[110,237]],
 right:[[120,142],[337,177],[326,200]],
 'up-right':[[123,140],[275,130],[273,145]],
 up:[[132,127],[257,96],[241,113]],
};
export function walkerFistOffset(direction:Direction,frame:number){
 const view=walkerView(direction),[x,y]=FISTS[view.key.replace('walker3-','')][Math.max(0,Math.min(2,frame-4))],k=WALKER_DISPLAY/WALKER_CELL;
 return {x:(x-WALKER_ANCHOR[0])*k*(view.mirror?-1:1),y:(y-WALKER_ANCHOR[1])*k};
}
/** Actual footfalls follow distance. Combat follows the committed hit clock. */
export function walkerFrame(e:Enemy,t:number){
 const m=e.motion,age=m?t-m.since:0,hitAge=m?t-m.hitAt:Infinity;
 if(m?.phase==='stagger'&&hitAge>=0&&hitAge<WALKER_ATTACK.stagger)return hitAge<.13?8:9;
 if(m?.phase==='windup')return 4;
 if(m?.phase==='strike')return age<WALKER_ATTACK.contact+.055?5:6;
 if(m?.phase==='recover')return age<WALKER_ATTACK.recovery*.78?7:atlas.idleFrame;
 if(m?.phase==='stagger')return 9;
 return e.moving?atlas.walkFrames[Math.floor((e.walkDistance||0)/WALKER_STRIDE)%atlas.walkFrames.length]:atlas.idleFrame;
}
export function walkerRecoil(e:Enemy,t:number,reduced=false){
 const m=e.motion,age=m?t-m.hitAt:Infinity;
 const amount=!reduced&&m?.phase==='stagger'&&age>=0&&age<.18?Math.sin(age/.18*Math.PI)*4:0;
 return {x:Math.cos(m?.hitAngle??0)*amount,y:Math.sin(m?.hitAngle??0)*amount};
}
