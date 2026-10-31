import {placementBounds,placementPoint,placementGeometryAsset,insideBuilding,type Placement} from './world-layout';
import type {World} from './survival-engine';

/** Stairs are floor art, not an opaque foreground roof. Include the approach
 * in roof fading so a survivor's head stays visible while climbing them. */
export function headquartersRoofBottom(p:Placement){
 const a=placementGeometryAsset(p);
 return p.assetId==='base_shelter_t1'&&a?.interior?p.y+(a.interior.y+a.interior.height)*p.scale:undefined;
}
export function withinRoofApproach(p:Placement,x:number,y:number){
 if(insideBuilding(p,x,y))return true;
 const bottom=headquartersRoofBottom(p);if(bottom===undefined)return false;
 const b=placementBounds(p),[px,py]=placementPoint(p,x,y,true);
 return px>b.x+b.width*.28&&px<b.x+b.width*.72&&py>=bottom&&py<=b.y+b.height+24*p.scale;
}
/** Keep a raid on the planning table visible to a survivor outside HQ. */
export function headquartersRaidVisible(p:Placement,w:World){
 return p.assetId==='base_shelter_t1'&&w.enemies.some(e=>e.hp>0&&e.siegeBuilding==='headquarters'&&withinRoofApproach(p,e.x,e.y));
}
