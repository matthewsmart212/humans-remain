import type {Direction,Enemy} from './survival-engine';
import {BRUTE} from './brute-model';
import data from '../public/survival/iron-brute-v1/atlas.json';
type Atlas={cell:number[];anchor:number[];directions:Record<Direction,{image:string;mirror:boolean;source?:string}>;eyes:Record<string,number[][][]>;hands:Record<string,number[][]>;grip:Record<string,number[]>;forearms?:Record<string,Record<string,number[][]>>;claws?:Record<string,string>};
export const BRUTE_ATLAS=data as unknown as Atlas;
export const BRUTE_CELL=384,BRUTE_ANCHOR=[192,330] as const,BRUTE_DISPLAY=310,BRUTE_STRIDE=BRUTE.stride;
const key=(s:string)=>'brute-'+s.split('/').at(-1)!.replace('.webp','');
export const BRUTE_IMAGE_SOURCES:Record<string,string>={bruteRubbleOchre:'/survival/world-rocks-v1/ochre-lone-boulder.webp',bruteRubbleChalk:'/survival/world-rocks-v1/chalk-cracked-rock.webp',...Object.fromEntries([...new Set(Object.values(BRUTE_ATLAS.directions).map(v=>v.image)),...Object.values(BRUTE_ATLAS.claws??{})].map(image=>[key(image),image]))};
export function bruteView(direction:Direction){const v=BRUTE_ATLAS.directions[direction];return {key:key(v.image),mirror:v.mirror,source:v.source??v.image.split('/').at(-1)!.replace('.webp','')}}
export function bruteEyes(direction:Direction,frame:number){return BRUTE_ATLAS.eyes[bruteView(direction).source]?.[frame]??[]}
export function bruteFrame(e:Enemy,t:number){
 const b=e.brute;if(!b)return 0;
 switch(b.phase){case 'melee-windup':case 'jump-windup':return 4;case 'melee-strike':return 6;case 'airborne':return 5;case 'slam-recover':return b.last==='grab'?(t-b.since<.18?10:13):(t-b.since<.18?6:7);case 'hook-windup':return 8;case 'hook-out':return 9;case 'hook-return':case 'pull':return 9;case 'hold':return 11;case 'crush':return 12;case 'release':return 13;case 'stagger':return 7;default:return e.moving?Math.floor((e.walkDistance??0)/BRUTE_STRIDE)%4:0}
}
function anchor(e:Enemy,point:readonly number[]){const view=bruteView(e.brute?.direction??e.motion?.direction??'down'),k=BRUTE_DISPLAY/BRUTE_CELL;return {x:e.x+(point[0]-BRUTE_ANCHOR[0])*k*(view.mirror?-1:1),y:e.y+(point[1]-BRUTE_ANCHOR[1])*k}}
export function bruteHand(e:Enemy,frame=8){const view=bruteView(e.brute?.direction??'down');return anchor(e,BRUTE_ATLAS.hands[view.source]?.[frame]??[280,230])}
export function bruteGrip(e:Enemy){const view=bruteView(e.brute?.direction??'down');return anchor(e,BRUTE_ATLAS.grip[view.source]??[192,230])}
export function bruteLift(e:Enemy,t:number,reduced=false){const b=e.brute;return b?.phase==='airborne'&&!reduced?Math.sin(Math.min(1,(t-b.since)/BRUTE.flight)*Math.PI)*BRUTE.jumpHeight:0}
/** Short, foot-anchored weight shifts; grapple/held poses stay exactly registered. */
export function bruteBodyOffset(e:Enemy,t:number,reduced=false){
 const b=e.brute;if(!b||reduced)return{x:0,y:0};const age=Math.max(0,t-b.since),clamp=(n:number)=>Math.max(0,Math.min(1,n));let forward=0,drop=0;
 if(b.phase==='jump-windup'){const p=clamp(age/BRUTE.windup);forward=-5*Math.sin(p*Math.PI*.8);drop=3*Math.sin(p*Math.PI)}
 if(b.phase==='melee-windup')forward=-5*clamp(age/BRUTE.meleeWindup);
 if(b.phase==='melee-strike')forward=12*Math.sin(clamp(age/BRUTE.meleeStrike)*Math.PI);
 if(b.phase==='slam-recover'&&b.last==='smash')drop=4*Math.sin(clamp(age/BRUTE.recovery)*Math.PI*2)*Math.exp(-age*8);
 return{x:Math.cos(b.angle)*forward,y:Math.sin(b.angle)*forward+drop};
}
