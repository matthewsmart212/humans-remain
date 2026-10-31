import type {World} from './survival-engine';

export type PlayerSample=Pick<World['player'],'x'|'y'|'walkDistance'|'walkBlend'|'runBlend'>&{sceneId?:string};
export function samplePlayer(w:World):PlayerSample{
 const {x,y,walkDistance,walkBlend,runBlend}=w.player;
 return {x,y,walkDistance,walkBlend,runBlend,sceneId:w.scene?.id};
}

/** Rendering between fixed physics ticks keeps 90/120 Hz displays smooth.
 * Only the presentation copy is interpolated; collisions and saved positions
 * always use the authoritative simulation. Teleports must remain instant. */
export function presentPlayer(w:World,previous:PlayerSample|undefined,fraction:number):World{
 if(!previous||previous.sceneId!==w.scene?.id||Math.hypot(w.player.x-previous.x,w.player.y-previous.y)>40)return w;
 const a=Math.max(0,Math.min(1,fraction)),p=w.player,lerp=(x:number,y:number)=>x+(y-x)*a;
 const step=(p.walkDistance-previous.walkDistance+112)%112;
 return {...w,player:{...p,x:lerp(previous.x,p.x),y:lerp(previous.y,p.y),
  walkDistance:(previous.walkDistance+step*a)%112,
  walkBlend:lerp(previous.walkBlend,p.walkBlend),runBlend:lerp(previous.runBlend,p.runBlend)}};
}
