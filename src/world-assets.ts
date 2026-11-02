import {restorationImages} from './camp-restoration';
import {withSouthHeadquartersGeometry,HQ_SOUTH_INTERIOR,HQ_FOUNDATION_DRESSING} from './headquarters-south-art';
import {IRONWORKS_WORLD_ART,FURNACE_ID} from './ironworks-data';
import {GARDEN_ART,GARDEN_ANCHOR,GARDEN_COLLISION} from './camp-garden-art';
import {MINEABLE_ROCKS} from './mining-rocks';
import {FORAGE_ART} from './forage-art';
import perimeterArt from './camp-perimeter-art.json';
import circularWallArt from './camp-circular-wall-art.json';
import type {AnimationMode,AnimationArea} from './asset-animation';
import {usesPaintedHomeTerrain} from './terrain-art';
import type {AssetCollision} from './asset-collision';
import {entries,type CatalogueEntry} from './catalogue-model';
import metadata from './world-image-metadata.json';
import {CAMP_ART,HEARTH_ART,HEARTH_FRAME_SIZE} from './camp-art';
import {addCampGround} from './camp-ground-art';
import hqFurniture from './hq-furniture-art.json';
import hqSupport from './hq-support-art.json';
import workshopArt from './workshop-art.json';
import treatmentArt from './treatment-art.json';
import campFoliageArt from './foliage-art.json';
import worldSceneryArt from './world-scenery-art.json';
import rockArt from './world-rock-art.json';
import sceneryCollisions from './scenery-collisions.json';
import rockCollisions from './rock-collisions.json';
import puddleArt from './puddle-art.json';
import treeArt from './tree-art.json';
const sceneryArt=[...worldSceneryArt,...rockArt];
const sceneryBlockers={...sceneryCollisions,...rockCollisions} as unknown as Record<string,AssetCollision>;
const foliageArt=[...campFoliageArt,...sceneryArt.filter(s=>s.kind==='foliage')];

export type WorldRole='prop'|'generator'|'hearth'|'well'|'storage'|'lamp'|'scrap'|'fuel'|'pallets'|'crate'|'search'|'animal'|'enemySpawn'|'crusher'|'shutter';
export type LocalRect={x:number;y:number;hw:number;hh:number};
/** Ground artwork is normalized to the original sprite canvas, independently of selection/collision bounds. */
export type GroundArtwork={image:string;rect:[number,number,number,number];size:[number,number]};
export type WorldAsset={perimeterCurve?:number[][];perimeterDrawOrder?:number;perimeterRise?:number;gate?:import('./camp-gates').GateArt;perimeter?:'wall'|'post'|'gate';id:string;name:string;group:string;image:string;crop:number[];anchor:number[];width:number;height:number;solid:boolean;allowTransparency?:boolean;foliage?:boolean;groundDetail?:boolean;puddle?:{water:number[][]};role:WorldRole;body:LocalRect[];collision?:AssetCollision;segments?:{x:number;y:number;ex:number;ey:number;r:number}[];interior?:{x:number;y:number;width:number;height:number};roof?:string;roofRect?:number[];foreground?:number[][];ground?:GroundArtwork;openFrames?:string[];frames?:string[];animationMode?:AnimationMode;animationArea?:AnimationArea;fps?:number;unlitSize?:number[];unlit?:string;unlitAnchor?:number[];catalogueId?:string;note?:string};
export const imageDimensions=metadata as Record<string,number[]>;
const sizes=imageDimensions;
for(const f of [...foliageArt,...puddleArt,...treeArt,...sceneryArt,...FORAGE_ART,...IRONWORKS_WORLD_ART,...GARDEN_ART])sizes[f.image]=f.size;
const assets:WorldAsset[]=[];
const sourceKey=(image:string,crop:number[])=>image+':'+crop.join(',');
const seen=new Map<string,WorldAsset>();
function add(a:WorldAsset,deduplicate=true){const key=sourceKey(a.image,a.crop);if(deduplicate&&seen.has(key))return seen.get(key)!;assets.push(a);seen.set(key,a);return a}
const body=(width:number,height:number):LocalRect[]=>[{x:0,y:-Math.min(40,height*.13),hw:width*.3,hh:Math.min(45,height*.2)}];
for(const e of entries.filter(e=>e.image&&!e.canonicalArt&&!e.id.startsWith('map_')&&!perimeterArt.some(a=>a.id===e.id)&&!circularWallArt.some(a=>a.id===e.id))){
 const image=e.image!,dim=sizes[image]||[1254,1254],crop=e.crop||[0,0,...dim];
 const width=e.artPreview?.worldWidth||(e.id.startsWith('base_hearth')?HEARTH_ART[e.tier as 1|2|3].width:e.id==='base_well_t1'?138:e.id==='base_lighting_t4'?72:e.id==='exp_generation_t1'?142:e.id==='prop_tree'?340:e.id==='base_water_store_t4'?180:e.id==='prop_flame'?65:e.id.startsWith('base_water_store')?150+(e.tier!-1)*70:e.id.includes('bed')||e.id.includes('cot')?160:130);
 let role:WorldRole=e.id==='exp_generation_t1'?'generator':e.id.startsWith('base_hearth')?'hearth':e.id.startsWith('base_well')?'well':e.id==='base_shared_store_t1'?'storage':e.id==='base_lighting_t4'?'lamp':e.id==='prop_scrap'?'scrap':e.id==='prop_planks'?'pallets':e.id==='existing_fuel_can'?'fuel':e.id==='existing_smashable_crate'?'crate':e.id==='existing_searchable_locker'?'search':'prop';
 let anchor=[crop[2]/2,crop[3]*.94];
 if(e.id==='art-scrapling-scrapling')anchor=[crop[2]/2,crop[3]*.96];
 if(e.id.startsWith('base_hearth'))anchor=[...HEARTH_ART[e.tier as 1|2|3].litAnchor];
 if(e.id==='base_well_t1'){if(image==='/survival/camp-well-t1.png')Object.assign(crop,[...CAMP_ART.campWell.crop]);anchor=[...CAMP_ART.campWell.anchor]}
 if(e.id==='base_lighting_t4'){Object.assign(crop,[263,7,600,1470]);anchor=[160,1441]}
 if(role==='generator')anchor=[crop[2]/2,crop[3]*.75];
 const height=width*crop[3]/crop[2],solid=!['effect','interface asset'].includes(e.recordType)&&!['scrap','fuel','pallets'].includes(role);
 const a:WorldAsset={id:e.id,name:e.name,group:e.family||e.category,image,crop,anchor,width,height,solid,role,body:solid?body(width,height):[],openFrames:e.artPreview?.openFrames,frames:e.artPreview?.frames,fps:e.artPreview?.fps,unlit:e.artPreview?.unlit,unlitSize:e.id.startsWith('base_hearth')?[HEARTH_FRAME_SIZE,HEARTH_FRAME_SIZE]:undefined,unlitAnchor:e.id.startsWith('base_hearth')?[...HEARTH_ART[e.tier as 1|2|3].unlitAnchor]:undefined,roof:e.artPreview?.roof,roofRect:e.artPreview?.roofRect,catalogueId:e.id,note:e.implemented?'Existing prototype interaction':role==='prop'?'Visual prop · gameplay not implemented':'Uses the existing starter interaction'};
 if(e.id.startsWith('base_shelter')){
  // Ground-contact wall traces use the source floor line, not the elevated wall top.
  const traces=e.tier===1?[[195,305,1210,305],[195,305,100,968],[1210,305,1300,968],[100,968,488,968],[925,968,1300,968]]:e.tier===2?[[175,270,1090,270],[175,270,65,1050],[1090,270,1188,1050],[65,1050,480,1050],[778,1050,1188,1050]]:[[175,325,1090,325],[175,325,67,1057],[1090,325,1187,1057],[67,1057,479,1057],[779,1057,1187,1057]];
  const k=width/crop[2],local=(x:number,y:number)=>({x:(x-anchor[0])*k,y:(y-anchor[1])*k});
  a.body=[];a.segments=traces.map(([x,y,ex,ey])=>({...local(x,y),ex:local(ex,ey).x,ey:local(ex,ey).y,r:13*k}));
  const top=local(traces[0][0],traces[0][1]),bottom=local(traces[1][2],traces[1][3]);a.interior={x:bottom.x,y:top.y,width:(traces[2][2]-traces[1][2])*k,height:bottom.y-top.y};
  a.foreground=e.tier===1?[[56,754,436,275],[914,750,436,278]]:[[24,830,465,246],[770,826,460,255]];
  a.note='Walkable interior · roof fades inside · wall footprints can be inspected';
 }
 if(role==='hearth')a.body=[{x:0,y:-23,hw:43*width/112,hh:23*width/112}];
 if(role==='well')a.body=[{x:0,y:-30,hw:46,hh:30}];
 if(role==='storage')a.body=[{x:0,y:-26,hw:46,hh:26}];
 if(role==='lamp')a.body=[{x:0,y:0,hw:10,hh:9}];
 // Keep the open-front workshop's blockers on the ground, below the roof overhang.
 if(e.id===workshopArt.id){a.anchor=[workshopArt.anchor[0]*crop[2],workshopArt.anchor[1]*crop[3]];a.collision=workshopArt.collision as AssetCollision;a.body=[];a.note='Camp smithy · craft tools, weapons, bows and arrows using logs and smelted iron.';}
 if(e.id===treatmentArt.id){a.anchor=[treatmentArt.anchor[0]*crop[2],treatmentArt.anchor[1]*crop[3]];a.collision=treatmentArt.collision as AssetCollision;a.body=[];a.note='Treatment centre with beds, supplies and a washbasin · open central approach; treatment gameplay is not connected yet.';}
 const furniture=hqFurniture.find(f=>f.id===e.id);
 if(furniture){a.anchor=[furniture.anchor[0]*crop[2],furniture.anchor[1]*crop[3]];a.collision=furniture.collision as AssetCollision;a.body=[];a.note=a.openFrames?.length?'Storage station · open or close the chest in Edit or nearby in Walk. Inventory is not connected yet.':'Headquarters furniture · artwork ready; exploration menus are not implemented.';}
 const support=hqSupport.find(f=>f.id===e.id);
 if(support){a.anchor=[support.anchor[0]*crop[2],support.anchor[1]*crop[3]];a.solid=false;a.body=[];a.collision={lineWidth:.008,paths:[]};a.allowTransparency=false;a.note=support.floorDecal?'Walkable floor decoration · keep on the headquarters base layer.':'Non-blocking headquarters decoration · unlock to reposition.';}
 const plant=foliageArt.find(f=>f.id===e.id);
 if(plant){a.anchor=[plant.anchor[0]*crop[2],plant.anchor[1]*crop[3]];a.foliage=true;a.solid=false;a.body=[];a.collision={lineWidth:.008,paths:[]};a.allowTransparency=false;a.note='Walk-through foliage · bends around feet, pushes further when sprinting and settles back. Automatic depth; no movement blocker.';}
 const scenery=sceneryArt.find(s=>s.id===e.id);
 if(scenery&&scenery.kind!=='foliage'){
  a.anchor=[scenery.anchor[0]*crop[2],scenery.anchor[1]*crop[3]];
  const walkable='walkable' in scenery&&scenery.walkable===true;
  a.collision=walkable?{lineWidth:.008,paths:[]}:sceneryBlockers[scenery.image.split('/').pop()!.replace('.webp','')];
  a.body=a.collision?[]:scenery.body;a.solid=!walkable;
  if(walkable){a.groundDetail=true;a.allowTransparency=false;}
  a.note=MINEABLE_ROCKS.has(e.id)?'Mineable boulder · requires a wooden or metal pickaxe; cracks, breaks into rubble and drops stone in Play.':walkable?'Loose stones · walkable ground decoration; no resource drops.':'Natural scenery · traced ground-level collision; no resource drops or harvesting behaviour.';
 }
 const puddle=puddleArt.find(f=>f.id===e.id);
 if(puddle){a.anchor=[crop[2]/2,crop[3]/2];a.puddle={water:puddle.water};a.solid=false;a.body=[];a.collision={lineWidth:.008,paths:[]};a.allowTransparency=false;a.note='Walkable rainwater · footsteps create ripples and sprinting produces small splashes.';}
 if(e.id==='prop_tree')a.body=[{x:0,y:-12,hw:24,hh:20}];
 const tree=treeArt.find(t=>t.id===e.id);
 if(tree){a.anchor=[...tree.frames[0].anchor];a.body=[{x:0,y:-10,hw:22,hh:18}];a.note='Choppable tree · axe-notched trunk, then a stump. Drops collectible logs into the existing wood supply slot.';}
 const forage=FORAGE_ART.find(f=>f.id===e.id);
 if(forage){a.anchor=forage.anchor.map((v,i)=>v*forage.size[i]);a.solid=forage.kind==='apple';a.body=a.solid?[{x:0,y:-8,hw:20,hh:15}]:[];a.foliage=forage.kind==='berries';a.allowTransparency=a.solid;a.note=`Pick ${forage.kind==='berries'?'berries':'apples'} nearby with the action button. Fruit regrows after ${forage.regrowDays} dawns.`;}
 const ironworks=IRONWORKS_WORLD_ART.find(f=>f.id===e.id);
 if(ironworks){a.anchor=ironworks.anchor.map((v,i)=>v*ironworks.size[i]);a.width=ironworks.worldWidth;a.height=a.width*ironworks.size[1]/ironworks.size[0];a.body=e.id===FURNACE_ID?[{x:-15,y:-29,hw:61,hh:31},{x:76,y:-21,hw:27,hh:24}]:[{x:0,y:-13,hw:72,hh:27}];a.solid=true;a.allowTransparency=false;a.note=e.id===FURNACE_ID?'Smelt ore or recycle scrap with log fuel. Collect ingots, craft gear and reinforce the bellows.':'Iron-veined boulder · metal pickaxe required · guaranteed iron ore and stone.';}
 if(GARDEN_ART.some(g=>g.id===e.id)){a.anchor=GARDEN_ANCHOR.map((v,i)=>v*crop[i+2]);a.body=[];a.collision=GARDEN_COLLISION;a.allowTransparency=false;a.note='Camp garden artwork · choose Broken or tiers 1–3 in Build. Farming and repair gameplay will be connected separately.';}
 if(role==='generator')a.body=[{x:0,y:-10,hw:48,hh:35}];
 add(withSouthHeadquartersGeometry(a),['crate','search'].includes(role)?false:true);
}
for(const f of perimeterArt){sizes[f.image]=f.size;assets.push({id:f.id,name:f.name,group:'Camp perimeter',image:f.image,crop:[0,0,...f.size],anchor:[f.anchor[0]*f.size[0],f.anchor[1]*f.size[1]],width:f.width,height:f.height,solid:f.kind!=='post',role:'prop',body:[],segments:f.segments,perimeter:f.kind as 'wall'|'post'|'gate',perimeterRise:f.rise,gate:f.gate,note:f.kind==='gate'?'Painted open/closed gate · tap Close once; it waits for a clear doorway.':'Continuous worn stockade · traced ground collision.'});if(f.gate){sizes[f.gate.leaf]=f.gate.leafSize;sizes[f.gate.post]=f.gate.postSize;}}
for(const f of circularWallArt){sizes[f.image]=f.size;assets.push({id:f.id,catalogueId:f.id,name:f.name,group:'Camp perimeter',image:f.image,crop:[0,0,...f.size],anchor:[f.anchor[0]*f.size[0],f.anchor[1]*f.size[1]],width:f.width,height:f.height,solid:true,allowTransparency:true,role:'prop',body:[],collision:f.collision as AssetCollision,segments:f.segments,perimeter:'wall',perimeterRise:f.rise,perimeterCurve:f.curve,perimeterDrawOrder:f.drawOrder,note:'Curved mossy timber wall · fixed orientation · keep the six camp roads clear.'});}
const catalogueIds=new Set(entries.map(e=>e.id));
// Saved custom placements can still use the prior NE shapes, although the
// editor catalogue offers only the corrected sixteen pieces.
export const WORLD_ASSETS=assets.filter(a=>catalogueIds.has(a.id)||circularWallArt.some(piece=>piece.id===a.id)).map(addCampGround);
for(const a of WORLD_ASSETS)if(a.ground)imageDimensions[a.ground.image]=a.ground.size;
export const ASSET_BY_ID=new Map(WORLD_ASSETS.map(a=>[a.id,a]));
export const TREE_LOG_IMAGE='/survival/world-scenery-v1/hollow-birch-log.webp';
export const assetImageKey=(url:string)=>'placed:'+url;
export function requiredImages(assetIds:string[],terrain?:{url:string},options:{animationFrames?:boolean}={}){const out:Record<string,string>=terrain&&!usesPaintedHomeTerrain(terrain)?{[assetImageKey(terrain.url)]:terrain.url}:{};for(const id of new Set(assetIds)){const a=ASSET_BY_ID.get(id);if(!a)continue;const frames=options.animationFrames===false?[a.frames?.[0],a.openFrames?.[0]]:[...(a.frames||[]),...(a.openFrames||[])];for(const url of [...restorationImages(id),a.image,a.roof,a.unlit,a.ground?.image,...(a.image===HQ_SOUTH_INTERIOR?HQ_FOUNDATION_DRESSING.map(d=>d.image):[]),a.gate?.leaf,a.gate?.post,a.gate?.states?.closed,a.gate?.states?.open,...frames])if(url)out[assetImageKey(url)]=url;if(treeArt.some(t=>t.id===id))out[assetImageKey(TREE_LOG_IMAGE)]=TREE_LOG_IMAGE}return out}
export const ROLE_LABELS:Record<WorldRole,string>={prop:'Visual prop',generator:'Generator / workshop',hearth:'Cooking hearth',well:'Drinking well',storage:'Shared supplies',lamp:'Powered lamp',scrap:'Scrap pickup',fuel:'Fuel pickup',pallets:'Pallet pickup',crate:'Smashable crate',search:'Searchable locker',animal:'Animal spawn',enemySpawn:'Enemy entrance',crusher:'Crusher',shutter:'Security shutter'};
