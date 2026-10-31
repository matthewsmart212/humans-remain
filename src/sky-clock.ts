import type {FieldKitSnapshot} from './field-kit';
import {RUN_DAY_SECONDS,RUN_NIGHT_SECONDS,DUSK_SECONDS,DAWN_SECONDS} from './survival-cycle';
import {FIELD_KIT_TOP,FIELD_KIT_UTILITY} from './field-kit-vitals-layout';
export type SkyCycle=NonNullable<FieldKitSnapshot['cycle']>;
// Shared artwork coordinates. Both platforms scale this same little instrument.
export const HORIZON={width:120,height:FIELD_KIT_UTILITY.height,radius:FIELD_KIT_TOP.radius,baseline:23.8,rise:10.2,icon:25,inset:14,handover:8,lip:29,orbRadius:9.3} as const;
export const DAY_WING={width:72,duration:220} as const;
export const DIAL_GLOW={size:54,pulseMs:4800} as const;
export const DIAL_SHAPE=`M11 2 H109 Q118 2 118 11 V${HORIZON.height-11} Q118 ${HORIZON.height-2} 109 ${HORIZON.height-2} H11 Q2 ${HORIZON.height-2} 2 ${HORIZON.height-11} V11 Q2 2 11 2 Z`;
export const DIAL_ARC=Array.from({length:41},(_,i)=>{const t=i/40;return `${i?'L':'M'}${HORIZON.inset+t*(HORIZON.width-HORIZON.inset*2)} ${HORIZON.baseline-Math.sin(Math.PI*t)*HORIZON.rise}`}).join(' ');
export type SkyOrb={icon:'sun'|'moon';travel:number;altitude:number;opacity:number;setting:boolean};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(value:number)=>{const t=clamp(value);return t*t*(3-2*t)};
// Monotone Hermite curves keep position AND velocity continuous at every
// waypoint, including the phase boundary in the middle of a body's rise.
function curve(times:number[],values:number[]){
 const gaps=times.slice(1).map((t,i)=>t-times[i]),slopes=gaps.map((h,i)=>(values[i+1]-values[i])/h);
 const tangents=times.map((_,i)=>{
  if(i===0||i===times.length-1||slopes[i-1]*slopes[i]<=0)return 0;
  const a=2*gaps[i]+gaps[i-1],b=gaps[i]+2*gaps[i-1];
  return (a+b)/(a/slopes[i-1]+b/slopes[i]);
 });
 return(seconds:number)=>{
  const t=Math.max(times[0],Math.min(times.at(-1)!,seconds));let i=0;
  while(i<gaps.length-1&&t>times[i+1])i++;
  const u=(t-times[i])/gaps[i],u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*values[i]+(u3-2*u2+u)*gaps[i]*tangents[i]+(-2*u3+3*u2)*values[i+1]+(u3-u2)*gaps[i]*tangents[i+1];
 };
}
function orbit(duration:number){
 const h=HORIZON,times=[-h.handover,0,duration/2,duration-h.handover,duration];
 const x=curve(times,[h.inset,h.inset+5,h.width/2,h.width-h.inset-3,h.width-h.inset]);
 const y=curve(times,[h.lip+h.orbRadius,h.baseline,h.baseline-h.rise,h.lip,h.lip+h.orbRadius]);
 return(icon:SkyOrb['icon'],elapsed:number):SkyOrb=>({icon,travel:(x(elapsed)-h.inset)/(h.width-h.inset*2),altitude:(h.baseline-y(elapsed))/h.rise,opacity:smooth((elapsed+h.handover)/h.handover)*smooth((duration-elapsed)/h.handover),setting:elapsed>=duration-h.handover});
}
const sunOrbit=orbit(RUN_DAY_SECONDS),moonOrbit=orbit(RUN_NIGHT_SECONDS);
/** Read the simulation's phase directly. There is no separate UI clock. */
export function skyClockView(cycle:SkyCycle){
 const progress=clamp(cycle.progress),duration=cycle.night?RUN_NIGHT_SECONDS:RUN_DAY_SECONDS,elapsed=(1-progress)*duration,remaining=progress*duration,icon=cycle.night?'moon':'sun';
 // Both bodies stay mounted. The incoming one starts below the painted rim
 // eight seconds before the change, while the outgoing disc is half hidden.
 // Its rise continues straight into its own phase, without a hold or restart.
 const incoming=-Math.min(remaining,HORIZON.handover);
 const orbs=[sunOrbit('sun',cycle.night?incoming:elapsed),moonOrbit('moon',cycle.night?elapsed:incoming)];
 const window=cycle.night?DAWN_SECONDS:DUSK_SECONDS;
 const twilight=clamp(1-remaining/window);
 return {icon,progress,elapsed,orbs,nightMix:cycle.night?1-twilight:twilight,dayTag:String(cycle.day).padStart(2,'0'),stage:cycle.stage.toLowerCase(),label:`Day ${cycle.day}. ${cycle.stage.toLowerCase()}. ${cycle.weather.toLowerCase()}.`} as const;
}
export function horizonPosition(orb:SkyOrb){return{x:HORIZON.inset+orb.travel*(HORIZON.width-HORIZON.inset*2)-HORIZON.icon/2,y:HORIZON.baseline-HORIZON.rise*orb.altitude-HORIZON.icon/2}}
export function skyHudLayout(width:number,height:number,safe={top:0,right:0,bottom:0,left:0},expanded=false,hasCycle=true,hasWaypoint=false,dayExpanded=false){
 const portrait=height>=width,left=Math.max(12,safe.left+8),right=Math.max(12,safe.right+8),clockWidth=HORIZON.width;
 const buttonsWidth=FIELD_KIT_UTILITY.width*3+20+(hasWaypoint?50:0);
 const toolbarWidth=buttonsWidth+(portrait?0:(hasCycle?clockWidth+12:0)+(dayExpanded?DAY_WING.width:0));
 const narrowWaypoint=portrait&&width<=355&&hasWaypoint;
 return{portrait,clockWidth,toolbarWidth,topOffset:FIELD_KIT_UTILITY.topOffset,vitalsTopOffset:portrait&&(expanded||narrowWaypoint)?104:expanded&&dayExpanded?52:0,combatWidth:narrowWaypoint?232:Math.max(0,width-left-right-toolbarWidth-12)};
}
