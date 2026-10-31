import type {World} from './survival-engine';

/** Shared atlas lighting; the simulation owns dusk/dawn, never a second clock. */
export const PLAYER_MAP_NIGHT={tint:'#4e85e9',moonlight:'#98b9f0',moonlightOpacity:.09,campRadius:650,campOpacity:.4} as const;
export function playerMapNightAmount(world:Pick<World,'nightAmount'|'phase'|'scene'>){
 if(world.scene)return 0;
 const value=world.nightAmount??(world.phase==='night'?1:0);
 const t=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
 return t*t*(3-2*t);
}
export function playerMapInk(night:number){
 // Bring up the pale ink early enough to stay legible on twilight paper.
 const t=Math.min(1,night*2.5),mix=t*t*(3-2*t);
 return `rgb(${[25,61,54].map((day,i)=>Math.round(day+([235,226,199][i]-day)*mix)).join(',')})`;
}
