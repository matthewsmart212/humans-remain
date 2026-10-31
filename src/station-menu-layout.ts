import type {World} from './survival-engine';

export type MenuInsets={top:number;right:number;bottom:number;left:number};
export type MenuRect={x:number;y:number;width:number;height:number};
export type StationMenuKind=NonNullable<World['stationPanel']>|'backpack';
const zero:MenuInsets={top:0,right:0,bottom:0,left:0};
/** One logical-pixel layout for DOM, native controls and the shared Skia camera. */
export function stationMenuLayout(width:number,height:number,safe:MenuInsets=zero){
 const wide=width/height>=1.2,uw=Math.max(1,width-safe.left-safe.right-24),uh=Math.max(1,height-safe.top-safe.bottom-24);
 const menuWidth=wide?Math.min(780,Math.max(Math.min(420,uw*.65),uw*.62),Math.max(1,uw-180)):uw;
 const menuHeight=wide?Math.min(640,uh):Math.min(560,Math.round(uh*.63));
 const panel:MenuRect={x:width-safe.right-12-menuWidth,y:wide?safe.top+12+(uh-menuHeight)/2:height-safe.bottom-12-menuHeight,width:menuWidth,height:menuHeight};
 const scene:MenuRect=wide?{x:safe.left+12,y:safe.top+58,width:Math.max(1,panel.x-safe.left-24),height:Math.max(1,height-safe.top-safe.bottom-70)}:{x:safe.left+12,y:safe.top+58,width:uw,height:Math.max(1,panel.y-safe.top-70)};
 return{wide,compact:menuHeight<430,panel,scene,player:{x:scene.x+scene.width*.52,y:scene.y+scene.height*.68}};
}
type Presentation={active:boolean;backpack:boolean;safe:MenuInsets;revision:number};
const presentations=new WeakMap<World['fire'],Presentation>();
/** Ephemeral UI state, never part of a round, inventory or saved world. */
export function presentStationMenu(w:World,active:boolean,backpack=false,safe?:MenuInsets){
 const previous=presentations.get(w.fire),insets=safe??previous?.safe??zero,changed=!previous||active!==previous.active||backpack!==previous.backpack||Object.keys(insets).some(k=>insets[k as keyof MenuInsets]!==previous.safe[k as keyof MenuInsets]);
 if(changed)presentations.set(w.fire,{active,backpack,safe:insets,revision:(previous?.revision??0)+1});
}
export const stationMenuRevision=(w:World)=>presentations.get(w.fire)?.revision??0;
export function stationMenuKind(w:World):StationMenuKind|undefined{
 const p=presentations.get(w.fire);return p?.active===false?undefined:p?.backpack?'backpack':w.stationPanel;
}
type Pan={key:string;at:number;from:{x:number;y:number};to:{x:number;y:number}};
const pans=new WeakMap<World['fire'],Pan>();
export const menuClock=()=>((globalThis.performance?.now?.()??Date.now())/1000);
export const stationMenuAnimating=(w:World,now=menuClock())=>!w.weather?.reducedMotion&&!!pans.get(w.fire)&&now-pans.get(w.fire)!.at<.25;
/** Wall time also animates an open backpack while simulation time is paused. */
export function stationMenuPan(w:World,width:number,height:number,camera:{x:number;y:number;scale:number},enabled:boolean,now=menuClock()){
 if(!enabled)return{x:0,y:0};
 const kind=stationMenuKind(w),safe=presentations.get(w.fire)?.safe??zero,layout=stationMenuLayout(width,height,safe);
 const key=kind?`${kind}:${width}:${height}:${camera.scale}:${Object.values(safe).join(',')}`:'closed';
 let state=pans.get(w.fire);
 const sample=(s:Pan)=>{const t=Math.max(0,Math.min(1,(now-s.at)/.24)),e=t*t*(3-2*t);return{x:s.from.x+(s.to.x-s.from.x)*e,y:s.from.y+(s.to.y-s.from.y)*e}};
 if(!state){state={key:'closed',at:now,from:{x:0,y:0},to:{x:0,y:0}};pans.set(w.fire,state)}
 if(key!==state.key){const from=sample(state);state={key,at:now,from,to:kind?{x:w.player.x-layout.player.x/camera.scale-camera.x,y:w.player.y-layout.player.y/camera.scale-camera.y}:{x:0,y:0}};pans.set(w.fire,state)}
 return w.weather?.reducedMotion?state.to:sample(state);
}
