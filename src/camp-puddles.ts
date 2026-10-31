import field from './camp-puddles.json';
import {usesPaintedHomeTerrain,HOME_TERRAIN} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {MAP_WIDTH} from './factory-map';
import {newPlacement,type Placement,type WorldLayout} from './world-layout';

export const CAMP_PUDDLE_PREFIX='camp-puddle-v1-';
export const CAMP_PUDDLES_TO_KEEP=new Set([1,4,6,9,11,13,17,20]);
/** Remove only our clustered water placements, once. Keep owner-created water,
 * edits to surviving puddles, and every unrelated placement exactly as saved. */
function reduceCampPuddles(layout:WorldLayout):WorldLayout{
 if(layout.terrainPuddleVersion!==1)return layout;
 const remove=new Set(field.map((_,i)=>CAMP_PUDDLE_PREFIX+(i+1)).filter((_,i)=>!CAMP_PUDDLES_TO_KEEP.has(i+1)));
 return {...layout,terrainPuddleVersion:2,items:layout.items.filter(p=>!remove.has(p.id)),updatedAt:new Date().toISOString()};
}
/** Add water to the current authored camp once; later deletions stay deleted. */
export function addApprovedCampPuddles(layout:WorldLayout):WorldLayout{
 if(usesPaintedHomeTerrain(layout.terrainImage)&&layout.terrainPuddleVersion===1)return reduceCampPuddles(layout);
 if(layout.terrainPuddleVersion||!usesPaintedHomeTerrain(layout.terrainImage)||!layout.items.some(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth'))return layout;
 const factor=MAP_WIDTH/HOME_TERRAIN.playableSize,existing=new Set(layout.items.map(p=>p.id));
 const additions:Placement[]=[];
 for(let i=0;i<field.length;i++){
  if(!CAMP_PUDDLES_TO_KEEP.has(i+1))continue;
  const f=field[i],a=ASSET_BY_ID.get(f.assetId),id=CAMP_PUDDLE_PREFIX+(i+1);if(!a?.puddle||existing.has(id))continue;
  const xs=a.puddle.water.map(p=>p[0]),ys=a.puddle.water.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
  const fw=f.width/width*factor,fh=f.height/height*factor,x=(f.left-HOME_TERRAIN.border)*factor+(.5-left)*fw,y=(f.top-HOME_TERRAIN.border)*factor+(.5-top)*fh;
  additions.push({...newPlacement(f.assetId,x,y),id,frame:{sourceAssetId:f.assetId,width:fw,height:fh,anchor:[.5,.5]},layer:-7,locked:false,solid:false,allowTransparency:false});
 }
 if(layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 return {...layout,terrainPuddleVersion:2,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}
