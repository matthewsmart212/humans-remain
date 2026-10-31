import {useEffect,useState} from 'react';
import type {World} from './survival-engine';
import {currentWaypoint,waypointBearing} from './waypoint';

/** Unwrap north crossings so a rotating needle never spins the long way round. */
export function useWaypointNavigation(world:{current:World|null},withBearing=true){
 const [sample,setSample]=useState<{target:World['waypoint'];angle:number}>(()=>({target:world.current?currentWaypoint(world.current):undefined,angle:0}));
 useEffect(()=>{const read=()=>{const w=world.current,target=w?currentWaypoint(w):undefined,raw=withBearing&&w&&target?waypointBearing(w.player,target):0;setSample(old=>{const angle=target?old.angle+Math.atan2(Math.sin(raw-old.angle),Math.cos(raw-old.angle)):0;return old.target===target&&Math.abs(old.angle-angle)<.001?old:{target,angle}})};read();const timer=setInterval(read,80);return()=>clearInterval(timer)},[world,withBearing]);
 return sample;
}
