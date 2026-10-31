import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {HOME_TERRAIN,usesPaintedHomeTerrain} from './terrain-art';
import type {WorldLayout} from './world-layout';
import {OUTDOOR_FOOTPRINT} from './outdoor-terrain';

export type WorldBounds={left:number;top:number;width:number;height:number;right:number;bottom:number};
export const rectBounds=(left:number,top:number,width:number,height:number):WorldBounds=>({left,top,width,height,right:left+width,bottom:top+height});
/** Original bounds remain available for artwork and legacy custom layouts. */
export function originalCampBounds(){
 const border=600/HOME_TERRAIN.playableSize;
 return rectBounds(-border*MAP_WIDTH,-border*MAP_HEIGHT,MAP_WIDTH*(1+border*2),MAP_HEIGHT*(1+border*2));
}
/** Bounding rectangle of the connected outdoor footprint, not a rescaled map. */
export function campBounds(layout?:Pick<WorldLayout,'terrainImage'>):WorldBounds{
 if(!usesPaintedHomeTerrain(layout?.terrainImage))return rectBounds(0,0,MAP_WIDTH,MAP_HEIGHT);
 const b=OUTDOOR_FOOTPRINT.bounds;
 return rectBounds(b.x,b.y,b.width,b.height);
}
/** Follow the registered tiles, including future inward corners and holes. */
export function campContains(layout:Pick<WorldLayout,'terrainImage'>|undefined,x:number,y:number,r=0){
 if(usesPaintedHomeTerrain(layout?.terrainImage))return OUTDOOR_FOOTPRINT.contains(x,y,r);
 const b=campBounds(layout);
 return x>=b.left+r&&x<=b.right-r&&y>=b.top+r&&y<=b.bottom-r;
}
/** Project editor dragging/snapping onto built ground rather than the empty notch. */
export function boundCampPoint(p:{x:number;y:number},layout?:Pick<WorldLayout,'terrainImage'>){
 if(usesPaintedHomeTerrain(layout?.terrainImage))return OUTDOOR_FOOTPRINT.bound(p);
 const b=campBounds(layout);return{x:Math.max(b.left,Math.min(b.right,p.x)),y:Math.max(b.top,Math.min(b.bottom,p.y))};
}
export function worldBounds(world?:{layout?:WorldLayout;scene?:{width:number;height:number}}):WorldBounds{
 return world?.scene?rectBounds(0,0,world.scene.width,world.scene.height):world?.layout?campBounds(world.layout):originalCampBounds();
}
