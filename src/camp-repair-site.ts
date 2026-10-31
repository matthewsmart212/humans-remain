import type {World} from './survival-engine';
import {lineClear} from './survival-engine';
import {campBuildingPlacements,type CampBuildingId} from './camp-restoration';
import {placementBounds,placementPoint} from './world-layout';
import {smithyDock} from './camp-smithy';
import {warehouseDock} from './warehouse';
import {furnaceDock} from './camp-furnace';
import {stationFront} from './camp-stations';

/** Existing ruins retain their authored placement, geometry and use socket. */
export function campRepairSite(w:World,id:CampBuildingId){
 if(w.scene)return undefined;
 const site=campBuildingPlacements(w.layout).find(site=>site.id===id);if(!site)return undefined;
 const p=site.placement,b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width/2,b.y+b.height+12*p.scale);
 const dock=id==='workshop'?smithyDock(p):id==='warehouse'?warehouseDock(p):id==='furnace'?furnaceDock(p):id==='well'?stationFront(w.camp,'well'):id==='fire'?stationFront(w.camp,'hearth'):{x,y};
 return {...site,...dock};
}
export function atCampRepairSite(w:World,id:CampBuildingId){
 const site=campRepairSite(w,id);
 return !!site&&Math.hypot(w.player.x-site.x,w.player.y-site.y)<145&&lineClear(w.player,site,w);
}
