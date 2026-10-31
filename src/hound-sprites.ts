import type {Direction,Enemy} from './survival-engine';
import {HOUND} from './hound-model';
import data from '../public/survival/scrap-hound-v1/atlas.json';
type Atlas={directions:Record<Direction,{image:string;mirror:boolean;source?:string}>;eyes:Record<string,number[][][]>;vents:Record<string,number[][][]>};
export const HOUND_ATLAS=data as unknown as Atlas;
export const HOUND_CELL=384,HOUND_ANCHOR=[192,320] as const,HOUND_DISPLAY=215;
const key=(url:string)=>'hound-'+url.split('/').at(-1)!.replace('.webp','');
export const HOUND_IMAGE_SOURCES:Record<string,string>=Object.fromEntries([...new Set(Object.values(HOUND_ATLAS.directions).map(v=>v.image))].map(url=>[key(url),url]));
export function houndView(direction:Direction){const view=HOUND_ATLAS.directions[direction];return {key:key(view.image),mirror:view.mirror,source:view.source??view.image.split('/').at(-1)!.replace('.webp','')}}
export function houndEyes(direction:Direction,frame:number){return HOUND_ATLAS.eyes[houndView(direction).source]?.[frame]??[]}
export function houndVents(direction:Direction,frame:number){return HOUND_ATLAS.vents[houndView(direction).source]?.[frame]??[]}
export function houndFrame(e:Enemy,t:number){const h=e.hound;if(!h)return 0;const age=t-h.since;
 switch(h.phase){case 'charge':return 4;case 'pounce':return 5;case 'bite-windup':return 4;case 'bite':return 6;case 'recover':return h.last==='pounce'?7:age<HOUND.biteRecovery*.6?6:0;case 'stagger':return age<HOUND.stagger*.55?8:9;default:return e.moving?Math.floor((e.walkDistance??0)/HOUND.stride)%4:0}
}
export function houndLift(e:Enemy,t:number,reduced=false){const h=e.hound;return h?.phase==='pounce'&&!reduced?Math.sin(Math.max(0,Math.min(1,(t-h.since)/HOUND.flight))*Math.PI)*HOUND.height:0}
export function houndOffset(e:Enemy,t:number,reduced=false){const h=e.hound;if(!h||reduced)return{x:0,y:0};const age=Math.max(0,t-h.since),u=Math.min(1,age/(h.phase==='charge'?HOUND.charge:HOUND.biteStrike)),forward=h.phase==='charge'?-4*u:h.phase==='bite'?7*Math.sin(u*Math.PI):0;return{x:Math.cos(h.angle)*forward,y:Math.sin(h.angle)*forward}}
