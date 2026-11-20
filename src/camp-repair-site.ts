import type {Vec,World} from './survival-engine';
import {GARDEN_GATE_CENTRE} from './camp-garden-art';
import {headquartersDock} from './run-progression';
import {withinActionReach} from './survival-engine';
import {campBuildingPlacements,type CampBuildingId} from './camp-restoration';
import {stationEdge} from './placement-contact';
import {placementArtPoint} from './world-layout';
import {smithyDock} from './camp-smithy';
import {warehouseDock} from './warehouse';
import {furnaceDock} from './camp-furnace';
import {stationFront} from './camp-stations';

/** Existing ruins retain their authored placement, geometry and use socket. */
export function campRepairSite(w:World,id:CampBuildingId,from?:Vec){
 if(w.scene)return undefined;
 const site=campBuildingPlacements(w.layout).find(site=>site.id===id);if(!site)return undefined;
 const p=site.placement;
 let dock;
 switch(id){
  case 'garden': dock=placementArtPoint(p,...GARDEN_GATE_CENTRE);break;
  case 'headquarters': dock=headquartersDock(p,from);break;
  case 'bunker': dock=placementArtPoint(p,.40,.90);break;
  case 'treatment': {const front=placementArtPoint(p,.41,.86);dock=from?stationEdge(p,from,front):front;break}
  case 'workshop': dock=smithyDock(p,from);break;
  case 'warehouse': dock=warehouseDock(p,from);break;
  case 'furnace': dock=furnaceDock(p,from);break;
  case 'well': dock=stationFront(w.camp,'well',w.layout,from);break;
  case 'fire': dock=stationFront(w.camp,'hearth',w.layout,from);break;
 }
 return {...site,...dock};
}
export function atCampRepairSite(w:World,id:CampBuildingId){
 const site=campRepairSite(w,id,w.player);
 return !!site&&withinActionReach(w,site);
}
