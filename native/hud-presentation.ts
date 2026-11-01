import type {MovementTrail} from '../src/movement-trail';
import {horizonPosition,skyClockView,type SkyCycle} from '../src/sky-clock';

export const MOVEMENT_TRAIL_DOTS=25;
export const NATIVE_SKY_SAMPLE_MS=250;
export type NativeTrailDot={x:number;y:number;r:number;opacity:number};
/** The same bounded dot geometry as movementTrailDots, computed on the UI
 * runtime without mounting views or committing React state for each touch. */
export function nativeTrailDot(trail:MovementTrail|null,index:number):NativeTrailDot{
 'worklet';
 if(!trail)return{x:0,y:0,r:0,opacity:0};
 const dx=trail.current.x-trail.origin.x,dy=trail.current.y-trail.origin.y,distance=Math.hypot(dx,dy);
 if(distance<5)return index===0?{x:trail.origin.x,y:trail.origin.y,r:3.5,opacity:.45}:{x:0,y:0,r:0,opacity:0};
 const steps=Math.min(24,Math.max(2,Math.ceil(distance/12)));
 if(index>steps)return{x:0,y:0,r:0,opacity:0};
 const t=index/steps;
 return{x:trail.origin.x+dx*t,y:trail.origin.y+dy*t,r:index===steps?5:index===0?3.5:2.6,opacity:.25+.6*t};
}

export type NativeSkyPose={sunX:number;sunY:number;sunOpacity:number;moonX:number;moonY:number;moonOpacity:number;nightMix:number};
/** Authoritative simulation samples: interpolation changes only presentation,
 * never advances the simulation or predicts a future day/night transition. */
export function nativeSkySample(cycle:SkyCycle){
 const view=skyClockView(cycle),sun=view.orbs[0],moon=view.orbs[1],a=horizonPosition(sun),b=horizonPosition(moon);
 return{pose:{sunX:a.x,sunY:a.y,sunOpacity:sun.opacity,moonX:b.x,moonY:b.y,moonOpacity:moon.opacity,nightMix:view.nightMix} satisfies NativeSkyPose,label:view.label,dayTag:view.dayTag};
}

type PollingClock={setInterval:(read:()=>void,ms:number)=>unknown;clearInterval:(timer:unknown)=>void};
/** Hidden native overlays own no polling timer. A newly visible overlay reads
 * immediately before waiting for its next periodic sample. */
export function startVisibleHudPolling(active:boolean,read:()=>void,ms:number,clock:PollingClock={setInterval:(fn,delay)=>setInterval(fn,delay),clearInterval:timer=>clearInterval(timer as ReturnType<typeof setInterval>)}):()=>void{
 if(!active)return()=>{};
 read();const timer=clock.setInterval(read,ms);
 return()=>clock.clearInterval(timer);
}
