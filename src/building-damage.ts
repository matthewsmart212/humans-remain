import {timeOf,type World} from './survival-engine';
import {buildingEstablished,buildingHp,CAMP_REPAIRS,type CampBuildingId} from './camp-restoration';

/** Headquarters keeps its existing perimeter shield and run-loss rule. */
export function damageBuilding(w:World,id:CampBuildingId,amount:number){
 const p=w.progression;if(!p||w.scene||w.phase==='over'||!Number.isFinite(amount)||amount<=0||id!=='headquarters'&&!buildingEstablished(w,id)||buildingHp(w,id)<=0)return false;
 if(id==='headquarters'){
  const shield=Math.min(p.defence,amount);p.defence-=shield;p.hqHp=Math.max(0,p.hqHp-(amount-shield));p.lastHit=timeOf(w);
  if(p.hqHp<=0){w.phase='over';w.cause='Headquarters fell.'}
 }else (p.buildingHp??={})[id]=Math.max(0,buildingHp(w,id)-amount);
 const broken=buildingHp(w,id)<=0;
 w.buildingHits??={};w.buildingHits[id]=timeOf(w);
 if(broken){w.repairCheckpoint=true;w.stationPanel=undefined;}
 return true;
}
