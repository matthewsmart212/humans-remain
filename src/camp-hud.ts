import {timeOf,type World} from './survival-engine';
import {CAMP_BUILDING_IDS,CAMP_REPAIRS,buildingEstablished,buildingHp,buildingMaxHp,type CampBuildingId} from './camp-restoration';

export type CampThreat={compact:boolean;title:string;detail:string;critical:boolean;approaching:boolean};
const HIT_VISIBILITY=4;
const campSources=new WeakMap<World,World>();
/** Interior HUDs observe the live outdoor raid without copying local entities. */
export function setCampThreatSource(world:World,camp:World){campSources.set(world,camp)}
/** An alert follows a real raid or recent damage, rather than the night clock. */
export class CampThreatTracker{
 private started:number|undefined;
 private attackedAt:number|undefined;
 sample(w:World):CampThreat|null{
  const camp=campSources.get(w)??w,t=timeOf(w),hits=CAMP_BUILDING_IDS.filter(id=>{const age=t-(camp.buildingHits?.[id]??-Infinity);return age>=0&&age<HIT_VISIBILITY});
  const raiders=camp.enemies.some(e=>e.hp>0&&!!e.siegeNight);
  if(!w.progression||w.phase==='over'||(!raiders&&!hits.length)){this.started=undefined;this.attackedAt=undefined;return null}
  if(this.started===undefined||t<this.started){this.started=t;this.attackedAt=undefined}
  if(hits.length&&this.attackedAt===undefined)this.attackedAt=t;
  const destroyed=hits.filter(id=>buildingHp(camp,id)<=0&&t-(camp.buildingHits?.[id]??0)<3).sort((a,b)=>(camp.buildingHits?.[b]??0)-(camp.buildingHits?.[a]??0))[0];
  const approaching=this.attackedAt===undefined;
  const names=hits.map(id=>CAMP_REPAIRS[id].name);
  const critical=hits.some(id=>buildingHp(camp,id)/buildingMaxHp(camp,id)<=.25);
  const title=destroyed?CAMP_REPAIRS[destroyed].name+' destroyed':approaching?'Robots approaching':hits.length===1?names[0]+(critical?' critical':' under attack'):'Camp under attack';
  return {compact:true,title,detail:names.slice(0,2).join(' · ')+(names.length>2?` +${names.length-2}`:''),critical,approaching};
 }
}

/** A recent hit briefly exposes health. Nearby condition and repair progress live by the action button. */
export function buildingHudState(w:World,id:CampBuildingId){
 if(!w.progression||w.scene||w.stationPanel||w.phase==='over'||!buildingEstablished(w,id)||w.buildingRepair?.id===id)return;
 const hitAge=timeOf(w)-(w.buildingHits?.[id]??-Infinity);
 if(hitAge<0||hitAge>=HIT_VISIBILITY)return;
 const alpha=Math.min(1,HIT_VISIBILITY-hitAge);
 const health=Math.max(0,Math.min(1,buildingHp(w,id)/buildingMaxHp(w,id)));
 const defence=id==='headquarters'?Math.max(0,Math.min(1,w.progression.defence/Math.max(1,w.progression.defenceMax))):undefined;
 if(!alpha||health<=0||health===1&&(defence===undefined||defence===1))return;
 const shield=defence!==undefined&&defence>0&&health===1,fraction=shield?defence!:health;
 return {alpha,fraction,percent:Math.ceil(fraction*100),label:shield?'HQ defences':CAMP_REPAIRS[id].name,shield,hit:hitAge>=0&&hitAge<.55,hitAge,critical:fraction<=.25};
}
