import {useEffect,useRef,useState} from 'react';
import {advanceAnimation,animationFrame} from './asset-animation';

/** A single reversible timeline; toggling the preview preserves current progress. */
export function useStepOnPreview(enabled:boolean,count:number,fps:number){
 const position=useRef(0),[frame,setFrame]=useState(0),[active,setActive]=useState(false),[running,setRunning]=useState(true);
 useEffect(()=>{
  if(!enabled||!running||count<2)return;
  const target=active?count-1:0;
  if(position.current===target)return;
  let previous=performance.now();
  const timer=setInterval(()=>{
   const now=performance.now();
   position.current=advanceAnimation(position.current,active,count,fps,Math.min(.1,(now-previous)/1000));previous=now;
   setFrame(animationFrame(position.current,count));
   if(position.current===target)clearInterval(timer);
  },1000/30);
  return()=>clearInterval(timer);
 },[enabled,count,fps,active,running]);
 return{frame,active,step:(on:boolean)=>{setActive(on);setRunning(true)},inspect:(i:number)=>{position.current=i;setFrame(i);setRunning(false)}};
}
