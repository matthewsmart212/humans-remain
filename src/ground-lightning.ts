import type {World} from './survival-engine';
import type {WeatherState} from './weather-model';
import type {LightViewport} from './lighting-model';
import {placementBounds,placementPoint} from './world-layout';
import {worldBounds} from './world-bounds';
export type GroundStrike={seed:number;x:number;y:number;height:number;scene:string};
const events=new WeakMap<WeatherState,{seed:number;strike?:GroundStrike}>();
const random=(seed:number,salt:number)=>((Math.imul(seed^salt,1597334677)>>>0)/4294967296);
/** Resolve once at the start of a cloud flash, then keep the hit anchored to the
 * world. Bounded attempts select visible clear ground, never a roof or interior. */
export function groundLightning(w:World,view:LightViewport):GroundStrike|undefined{
 const s=w.weather;if(!s?.options.lightning||s.strikeAge>=1||w.scene?.weather==='sheltered'||w.scene?.lighting==='baked')return;
 const scene=w.scene?.id||'camp';let event=events.get(s);
 if(!event||event.seed!==s.seed){
  event={seed:s.seed};events.set(s,event);
  // Some flashes stay distant; most have a visible ground contact.
  if(s.seed%3===0)return;
  const bounds=worldBounds(w);
  for(let i=0;i<24;i++){
   const x=view.x+view.width*(.16+random(s.seed,97+i*831)*.68),y=view.y+view.height*(.42+random(s.seed,733+i*313)*.43);
   if(x<bounds.left+70||y<bounds.top+70||x>bounds.right-70||y>bounds.bottom-70||Math.hypot(x-w.player.x,y-w.player.y)<100)continue;
   const blocked=(w.layout?.items||[]).some(p=>{const b=placementBounds(p),[px,py]=placementPoint(p,x,y,true);return px>b.x-45&&px<b.x+b.width+45&&py>b.y-45&&py<b.y+b.height+45});
   if(blocked)continue;
   event.strike={seed:s.seed,x,y,height:Math.max(360,Math.min(1100,view.height*.95)),scene};break;
  }
 }
 return event.strike?.scene===scene?event.strike:undefined;
}
