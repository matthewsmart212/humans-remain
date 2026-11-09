import {timeOf,facing,STEP,type World,type Vec} from './survival-engine';
import {CAMP_REPAIRS,buildingEstablished,type CampBuildingId} from './camp-restoration';
import {buildingRepairStatus,buildingRepairCost,restoreCampBuilding,headquartersBench,headquartersDock,nearbyHeadquarters} from './run-progression';
import {campRepairSite} from './camp-repair-site';
import {hasGear} from './player-gear';

export type BuildingRepair={id:CampBuildingId;cost:import('./forge-recipes').MaterialCost;started:number;updatedAt:number;worked:number;held:boolean;duration:number;origin:Vec;hp:number;hurtUntil:number};
export const repairProgress=(w:World)=>w.buildingRepair?Math.max(0,Math.min(1,w.buildingRepair.worked/w.buildingRepair.duration)):0;
export function holdBuildingRepair(w:World,held:boolean){
 if(!w.buildingRepair)return false;
 w.buildingRepair.held=held;return true;
}
export function repairAnchor(w:World,id:CampBuildingId){
 if(id==='headquarters'&&nearbyHeadquarters(w)){const bench=headquartersBench(w);if(bench)return headquartersDock(bench)}
 return campRepairSite(w,id);
}
export function beginBuildingRepair(w:World,id:CampBuildingId){
 if(w.creativeMode)return restoreCampBuilding(w,id);
 if(id==='headquarters'||w.buildingRepair||buildingRepairStatus(w,id)!=='Ready'||!hasGear(w,'repairHammer')||w.player.hurtUntil>timeOf(w)||w.dodge||w.axeSwing||w.spearThrust||w.swordThrust||w.bowShot)return false;
 const site=repairAnchor(w,id);if(!site)return false;
 w.player.equipped='repairHammer';w.player.moving=false;w.player.sprinting=false;
 const placement=campRepairSite(w,id)?.placement;
 if(placement)w.player.direction=facing(placement.x-w.player.x,placement.y-w.player.y);
 w.buildingRepair={id,cost:{...buildingRepairCost(w,id)},started:timeOf(w),updatedAt:timeOf(w),worked:0,held:false,duration:buildingEstablished(w,id)?4:6,origin:{x:w.player.x,y:w.player.y},hp:w.player.hp,hurtUntil:w.player.hurtUntil};
 w.stationPanel=undefined;w.attackQueuedUntil=undefined;
 return true;
}
export function cancelBuildingRepair(w:World,notify=true){
 if(!w.buildingRepair)return false;w.buildingRepair=undefined;w.repairHammerUntil=undefined;
 if(notify){w.notice='Repair cancelled · No materials used';w.noticeUntil=timeOf(w)+2}return true;
}
/** Holding adds work; releasing drains it at the same rate. Only completion pays. */
export function stepBuildingRepair(w:World,input:Vec){
 const job=w.buildingRepair;if(!job)return;
 const p=w.player;
 if(Math.hypot(input.x,input.y)>.05||Math.hypot(p.x-job.origin.x,p.y-job.origin.y)>3||p.hp<job.hp||p.hurtUntil>job.hurtUntil||p.equipped!=='repairHammer'||!hasGear(w,'repairHammer')||w.stationPanel||w.dodge||w.bruteGrab||w.axeSwing||w.spearThrust||w.swordThrust||w.bowShot||buildingRepairStatus(w,job.id)!=='Ready'){
  cancelBuildingRepair(w);return;
 }
 const dt=Math.min(STEP,Math.max(0,timeOf(w)-job.updatedAt));job.updatedAt=timeOf(w);
 job.worked=Math.max(0,Math.min(job.duration,job.worked+(job.held?dt:-dt)));
 if(job.held&&job.worked>=job.duration-1e-8){
  const completed=restoreCampBuilding(w,job.id);
  w.buildingRepair=undefined;
  if(!completed){w.notice='Repair cancelled · No materials used';w.noticeUntil=timeOf(w)+2}
 }
}
