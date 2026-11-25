import type {World} from './survival-engine';

type PatchPose={x:number;y:number;walkDistance:number};
export type PresentedWorld=World&{presentedPatch?:PatchPose};
export type PlayerSample=Pick<World['player'],'x'|'y'|'walkDistance'|'walkBlend'|'runBlend'>&{sceneId?:string;patch?:PatchPose};
export function samplePlayer(w:World):PlayerSample{
 const {x,y,walkDistance,walkBlend,runBlend}=w.player,q=w.patchQuest;
 return {x,y,walkDistance,walkBlend,runBlend,sceneId:w.scene?.id,
  patch:q?.servoInstalled?{x:q.position.x,y:q.position.y,walkDistance:q.walkDistance}:undefined};
}

// Simulation and network snapshots store the gait modulo one 112-unit cycle.
const gaitPhase=(distance:number)=>distance-112*Math.floor(distance/112);
export function interpolateWalkDistance(from:number,to:number,fraction:number){
 return gaitPhase(from+gaitPhase(to-from)*fraction);
}

/** Render between physics ticks. Actors' collisions and saved positions stay
 * on the simulation tick, and a change of scene or teleport displays at once. */
export function presentPlayer(w:World,previous:PlayerSample|undefined,fraction:number):PresentedWorld{
 if(!previous||previous.sceneId!==w.scene?.id||Math.hypot(w.player.x-previous.x,w.player.y-previous.y)>40)return w;
 const a=Math.max(0,Math.min(1,fraction)),p=w.player,lerp=(x:number,y:number)=>x+(y-x)*a;
 const q=w.patchQuest,last=previous.patch;
 const presentedPatch=q?.moving&&last&&Math.hypot(last.x-q.position.x,last.y-q.position.y)<=40
  ?{x:lerp(last.x,q.position.x),y:lerp(last.y,q.position.y),walkDistance:interpolateWalkDistance(last.walkDistance,q.walkDistance,a)}
  :undefined;
 return {...w,presentedPatch,player:{...p,x:lerp(previous.x,p.x),y:lerp(previous.y,p.y),
  walkDistance:interpolateWalkDistance(previous.walkDistance,p.walkDistance,a),
  walkBlend:lerp(previous.walkBlend,p.walkBlend),runBlend:lerp(previous.runBlend,p.runBlend)}};
}
