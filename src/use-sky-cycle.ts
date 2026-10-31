import {useEffect,useState} from 'react';
import {cycleStatus} from './survival-cycle';
import type {World} from './survival-engine';
import type {SkyCycle} from './sky-clock';

export type SkyWorldRef={readonly current:World|null};
/** Sample only the dial at 30Hz. The rest of the HUD can keep its coarse
 * snapshots; motion always follows simulation time, including pause/resume. */
export function useSkyCycle(fallback:SkyCycle,world:SkyWorldRef|undefined,paused:boolean){
 const [sample,setSample]=useState<SkyCycle|null>(()=>(world?.current?cycleStatus(world.current):null)??null);
 useEffect(()=>{
  if(!world)return;
  let frame=0,last=-Infinity;
  const read=()=>{
   const next=(world.current?cycleStatus(world.current):null)??null;
   setSample(previous=>previous?.progress===next?.progress&&previous?.day===next?.day&&previous?.night===next?.night&&previous?.weather===next?.weather?previous:next);
  };
  const tick=(now:number)=>{if(now-last>=1000/30){last=now;read()}frame=requestAnimationFrame(tick)};
  read();if(!paused)frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[world,paused]);
 return world?(sample??fallback):fallback;
}
