import {timeOf,type World} from './survival-engine';

/** Logical screen points, shared by native controls and both world cameras. */
export function campfireLayout(width:number,height:number){
 const wide=width/height>=1.2,compact=wide?height<=360:height<=660;
 return{wide,compact,dockWidth:Math.min(wide?326:356,width-24),dockHeight:compact?272:wide?346:360,slotHeight:compact?44:50,supplyHeight:compact?64:wide?68:76};
}

/** Shared world-space footprint keeps rendering and camera clearance in sync. */
export function campfireServingLayout(hearth:{x:number;y:number},width:number,height:number){
 const left=hearth.x+width*.5+12,top=hearth.y-height*.3;
 return{left,top,width:168,height:112,mealWidth:42,mealHeight:28,
  meals:Array.from({length:6},(_,i)=>({x:left+18+(i%3)*44,y:top+25+Math.floor(i/3)*32})),
  collect:{x:left+84,y:top+76}};
}

// Presentation-only state lives outside the save and survives interpolated world
// copies. Opening a tray must never change the player's chosen zoom.
const transitions=new WeakMap<World['fire'],{open:boolean;from:number;at:number}>();
export function campfireCameraBlend(w:World,open:boolean){
 const now=timeOf(w),state=transitions.get(w.fire),sample=(s:NonNullable<typeof state>)=>{
  const t=Math.max(0,Math.min(1,(now-s.at)/.24)),ease=t*t*(3-2*t);
  return s.from+((s.open?1:0)-s.from)*ease;
 };
 if(!state){transitions.set(w.fire,{open,from:0,at:now});return open&&w.weather?.reducedMotion?1:0}
 if(state.open!==open){state.from=sample(state);state.open=open;state.at=now}
 return w.weather?.reducedMotion?(open?1:0):sample(state);
}
