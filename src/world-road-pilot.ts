import {EAST_TERRAIN_SCALE} from './east-approach';
import {terrainIntersects,type TerrainView} from './outdoor-terrain';
import campPatches from './camp-road-patches.json';
import districtPatches from './district-road-patches.json';
import completePatches from './complete-road-patches.json';
import {ROAD_CHUNKS} from './terrain-stream-art';

// Registered, individually designed road + soil patches. Never repeat or bend them.
export const ROAD_PILOT_SOURCE={x:4100,y:4000,width:1536,height:1024} as const;
// Outer extensions sit below the approved exits: their opaque cores stay intact.
export const ROAD_TERRAIN_PATCHES=[...completePatches,...districtPatches,{...ROAD_PILOT_SOURCE,id:'southeast',key:'roadTerrainPilotSE'},...campPatches];
export const ROAD_PILOT_IMAGES:Record<string,string>={roadTerrainPilotSE:'/survival/road-pilot-v1/southeast.webp',...Object.fromEntries(campPatches.map(p=>[p.key,`/survival/camp-road-patches-v1/${p.id}.webp`])),...Object.fromEntries(districtPatches.map(p=>[p.key,`/survival/district-road-patches-v1/${p.id}.webp`])),...Object.fromEntries(completePatches.map(p=>[p.key,`/survival/complete-roads-v1/${p.id}.webp`]))};
export const ROAD_OVERVIEW_IMAGES:Record<string,string>=Object.fromEntries(ROAD_TERRAIN_PATCHES.map(p=>[p.key+'Preview',`/survival/road-overviews-v1/${p.key}.webp`]));
export const ROAD_PILOT_SHADER=`
uniform shader artwork;
uniform float4 bounds;
uniform float scale;
half4 main(float2 p){
 float2 q=(p-bounds.xy)/scale;
 float2 size=bounds.zw/scale;
 float edge=min(min(q.x,q.y),min(size.x-q.x,size.y-q.y));
 float outer=smoothstep(0.,96.,edge);
 float2 source=p/scale+float2(600.);
 // Preserve every original opaque camp pixel. Only its outer scenery changes.
 float outside=max(max(source.x,source.y)-4450.,350.-min(source.x,source.y));
 float camp=smoothstep(0.,40.,outside);
 return artwork.eval(p)*(outer*camp);
}`;

export function drawRoadPilot(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,view?:TerrainView){
 const target=ctx as CanvasRenderingContext2D&{requestRoadArtwork?:(v:TerrainView)=>void;drawRoadTerrainPatch?:(image:HTMLImageElement,rect:TerrainView,scale:number,sample?:TerrainView,core?:TerrainView)=>void};
 if(view)target.requestRoadArtwork?.(view);
 for(const p of ROAD_TERRAIN_PATCHES){
 const s=EAST_TERRAIN_SCALE;
 const bounds={x:(p.x-600)*s,y:(p.y-600)*s,width:p.width*s,height:p.height*s};
 if(view&&!terrainIntersects(bounds,view))continue;
 if(target.requestRoadArtwork){
  for(const t of roadChunksByParent.get(p.key)||[]){
   if(view&&!terrainIntersects(t.core,view))continue;
   const detail=t.levels.map(l=>imgs[l.key]).find(Boolean),image=detail||imgs[p.key]||imgs[p.key+'Preview'];if(!image)continue;
   target.drawRoadTerrainPatch?.(image,bounds,s,detail?t.sample:bounds,t.core);
  }
  continue;
 }
 const image=imgs[p.key]||imgs[p.key+'Preview'];if(!image)continue;
 // Both browser and native use Skia. Do not show an unmasked rectangle in a fallback.
 target.drawRoadTerrainPatch?.(image,bounds,s);
 }
}
const roadChunksByParent=new Map<string,{core:TerrainView;sample:TerrainView;levels:typeof ROAD_CHUNKS[number]['levels']}[]>();
const worldRect=(r:TerrainView)=>({x:(r.x-600)*EAST_TERRAIN_SCALE,y:(r.y-600)*EAST_TERRAIN_SCALE,width:r.width*EAST_TERRAIN_SCALE,height:r.height*EAST_TERRAIN_SCALE});
for(const t of ROAD_CHUNKS){const list=roadChunksByParent.get(t.parent)||[];list.push({core:worldRect(t),sample:worldRect(t.sample),levels:t.levels});roadChunksByParent.set(t.parent,list)}
