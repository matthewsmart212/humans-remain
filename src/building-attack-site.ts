import type {World,Vec} from './survival-engine';
import {headquartersBench,headquartersDock} from './run-progression';
import {placementBounds,placementPoint} from './world-layout';
import {buildingRestored,type CampBuildingId} from './camp-restoration';
import {campRepairSite} from './camp-repair-site';

export type BuildingAttackSite=Vec&{id:CampBuildingId;reach:number;impact:Vec};
/** Feet follow a collision-safe approach; strikes face the actual structure. */
export function buildingAttackSite(w:World,id:CampBuildingId):BuildingAttackSite|undefined{
 if(id==='headquarters'){
  const bench=headquartersBench(w);
  if(bench){const b=placementBounds(bench),[x,y]=placementPoint(bench,b.x+b.width*.5,b.y+b.height*.72);return{id,...headquartersDock(bench),reach:55,impact:{x,y}}}
  const camp=w.progression?.camp;return camp?{id,...camp,reach:100,impact:{...camp}}:undefined;
 }
 const site=buildingRestored(w,id)?campRepairSite(w,id):undefined;
 return site?{id,x:site.x,y:site.y,reach:100,impact:{x:site.x,y:site.y-50}}:undefined;
}
