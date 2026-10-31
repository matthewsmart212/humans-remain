import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {usesPaintedHomeTerrain} from './terrain-art';
import {OUTDOOR_FOOTPRINT} from './outdoor-terrain';
import {worldBounds,rectBounds,type WorldBounds} from './world-bounds';
import {ASSET_BY_ID,type WorldAsset} from './world-assets';
import {placementBounds,placementPoint,insideBuilding,type Placement,type WorldLayout} from './world-layout';
import {ASSET_CONNECTIONS} from './world-scenes';
import {TREE_ART} from './tree-chopping';
import {mapBuildingArt,mapWallsArt,type MapArtKind,type MapIllustration} from './player-map-art';
import {CAMP_MAP_WALL_PATHS,isCampMapWall} from './player-map-camp-wall';
import type {Direction,Vec,World} from './survival-engine';

/** Illustrated cartography registered to the actual water masks and road data.
 * Only ground is baked: engraved objects and landmarks follow the live layout. */
export const PLAYER_MAP_TERRAIN_URL='/maps/world-illustrated.webp';
export const PLAYER_MAP_MAX_ZOOM=12;
export type PlayerMapImage={id:string;url:string;x:number;y:number;width:number;height:number};
export type PlayerMapScene={id:string;name:string;bounds:WorldBounds;images:PlayerMapImage[];footprint:Vec[][]};
export type PlayerMapPath={id:string;path:string;fill:string;stroke?:string;strokeWidth?:number};
export type PlayerMapLandmark={id:string;kind:'camp'|'well'|'bunker'|'headquarters'|'storage'|'building';label:string;x:number;y:number;caption?:Vec};
export type PlayerMapFeatures={paths:PlayerMapPath[];landmarks:PlayerMapLandmark[];illustrations:MapIllustration[]};
export type PlayerMapView={x:number;y:number;width:number;height:number;scale:number};

const HEADINGS:Record<Direction,number>={up:0,'up-right':45,right:90,'down-right':135,down:180,'down-left':225,left:270,'up-left':315};
/** Clockwise degrees for an arrow initially pointing north. The game already
 * stores screen/world directions: +x is east and +y is south. */
export const playerMapHeading=(direction:Direction):number=>HEADINGS[direction]??0;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const rectangle=(x:number,y:number,width:number,height:number):Vec[]=>[{x,y},{x:x+width,y},{x:x+width,y:y+height},{x,y:y+height}];

/** Scene-local coordinates stay local. In particular, a bunker player must
 * never be plotted at those same numbers on the outdoor world. */
export function playerMapScene(world:World):PlayerMapScene{
 const bounds=worldBounds(world);
 if(world.scene){
  const scene=world.scene;
  const images=scene.terrain.tiles?.length?scene.terrain.tiles.map(t=>({id:t.key,url:t.url,x:t.x,y:t.y,width:t.width,height:t.height})):[{id:scene.terrain.key,url:scene.terrain.url,x:0,y:0,width:scene.width,height:scene.height}];
  // Retain the complete interior artwork, including walls and furnishings.
  // Walkability describes movement, not which parts belong on its map.
  return{id:scene.id,name:scene.name,bounds,images,footprint:[rectangle(bounds.left,bounds.top,bounds.width,bounds.height)]};
 }
 const layout=world.layout,custom=layout?.terrainImage;
 if(custom&&!usesPaintedHomeTerrain(custom)){
  const border=layout?.terrainBorder||0;
  const sx=border>0?MAP_WIDTH/(custom.width-border*2):MAP_WIDTH/custom.width;
  const sy=border>0?MAP_HEIGHT/(custom.height-border*2):MAP_HEIGHT/custom.height;
  return{id:'camp',name:'World map',bounds,images:[{id:'custom-terrain:'+custom.id,url:custom.url,x:-border*sx,y:-border*sy,width:custom.width*sx,height:custom.height*sy}],footprint:[rectangle(bounds.left,bounds.top,bounds.width,bounds.height)]};
 }
 const ground=OUTDOOR_FOOTPRINT.bounds;
 return{id:'camp',name:'World map',bounds,images:[{id:'world-terrain',url:PLAYER_MAP_TERRAIN_URL,...ground}],footprint:[rectangle(ground.x,ground.y,ground.width,ground.height)]};
}

/** A single isotropic transform is shared by art, pins, touch input and player.
 * Fit leaves room for the complete direction arrow. Zoomed camera bounds keep
 * that same screen-space inset, so Find me also works at the world's edges. */
export function playerMapView(bounds:WorldBounds,screenWidth:number,screenHeight:number,zoom=1,focus?:Vec,maxZoom=PLAYER_MAP_MAX_ZOOM):PlayerMapView{
 const sw=Math.max(1,Number.isFinite(screenWidth)?screenWidth:1),sh=Math.max(1,Number.isFinite(screenHeight)?screenHeight:1);
 const inset=Math.min(32,sw*.2,sh*.2);
 const scale=Math.min((sw-inset*2)/bounds.width,(sh-inset*2)/bounds.height)*clamp(Number.isFinite(zoom)?zoom:1,1,maxZoom);
 const width=sw/scale,height=sh/scale,c=focus??{x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2};
 const margin=inset/scale;
 const origin=(start:number,end:number,size:number,centre:number)=>{
  const first=start-margin,last=end+margin-size;
  return first>last?(start+end-size)/2:clamp(centre-size/2,first,last);
 };
 const x=origin(bounds.left,bounds.right,width,c.x),y=origin(bounds.top,bounds.bottom,height,c.y);
 return{x,y,width,height,scale};
}
export const projectMapPoint=(point:Vec,view:PlayerMapView):Vec=>({x:(point.x-view.x)*view.scale,y:(point.y-view.y)*view.scale});
export const unprojectMapPoint=(point:Vec,view:PlayerMapView):Vec=>({x:point.x/view.scale+view.x,y:point.y/view.scale+view.y});

const n=(value:number)=>Number(value.toFixed(2));
const polygon=(points:readonly Vec[])=>points.length?'M'+points.map(p=>`${n(p.x)} ${n(p.y)}`).join('L')+'Z':'';
function transformedPolygon(p:Placement,points:Vec[]){return polygon(points.map(v=>{const [x,y]=placementPoint(p,v.x,v.y);return{x,y}}))}
function ellipse(p:Placement,cx:number,cy:number,rx:number,ry:number){
 // Eight vertices are enough at map scale; both mirroring and placement
 // rotation are the exact production transforms, including custom anchors.
 return transformedPolygon(p,Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return{x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry}}));
}
function landmark(p:Placement,a:WorldAsset):PlayerMapLandmark|undefined{
 const b=placementBounds(p),centre=()=>{const [x,y]=placementPoint(p,b.x+b.width/2,b.y+b.height*.58);return{x,y}};
 const contact=()=>{const [x,y]=placementPoint(p,p.x,p.y);return{x,y}};
 if(p.role==='hearth')return{id:p.id,kind:'camp',label:'Camp',...contact()};
 if(p.role==='well')return{id:p.id,kind:'well',label:'Well',...contact()};
 if(ASSET_CONNECTIONS[p.assetId]?.destination.sceneId==='bunker')return{id:p.id,kind:'bunker',label:'Bunker',...centre()};
 if(a.interior||/^headquarters$/i.test(a.name))return{id:p.id,kind:'headquarters',label:'Headquarters',...centre()};
 if(p.role==='storage'||a.openFrames?.length)return{id:p.id,kind:'storage',label:'Storage',...contact()};
 if(b.width>170&&/warehouse|workshop|treatment centre/i.test(a.name))return{id:p.id,kind:'building',label:/workshop/i.test(a.name)?'Workshop':/treatment/i.test(a.name)?'Treatment':a.name,...centre()};
 return undefined;
}
const cache=new WeakMap<WorldLayout,PlayerMapFeatures>();
const emptyFeatures:PlayerMapFeatures={paths:[],landmarks:[],illustrations:[]};
/** Static geometry is batched into a handful of paths once per layout, never
 * thousands of UI nodes or a fresh world scan for every marker update. */
export function playerMapFeatures(layout?:WorldLayout):PlayerMapFeatures{
 if(!layout)return emptyFeatures;
 const old=cache.get(layout);if(old)return old;
 const batches={woodland:[] as string[],foliage:[] as string[],treeShadows:[] as string[],trees:[] as string[],treeInk:[] as string[],rocks:[] as string[],rockInk:[] as string[],puddles:[] as string[]};
 const landmarks:PlayerMapLandmark[]=[],walls:{p:Placement;a:WorldAsset}[]=[],buildings:MapIllustration[]=[];
 const shelters=layout.items.filter(p=>ASSET_BY_ID.get(p.assetId)?.interior);
 for(const p of layout.items){
  const a=ASSET_BY_ID.get(p.assetId);if(!a||['animal','enemySpawn','scrap','fuel','pallets'].includes(p.role))continue;
  const b=placementBounds(p),pin=landmark(p,a);
  // Indoor contents belong to their building. A chest hidden beneath the
  // headquarters must not put a second icon or a caption across its roof.
  if(pin?.kind==='storage'&&shelters.some(building=>insideBuilding(building,p.x,p.y)))continue;
  if(pin)landmarks.push(pin);
  if(TREE_ART.has(a.id)||a.id==='prop_tree'){
   // A small engraved tree, rooted at the actual placement. The same root,
   // scale, rotation and mirroring are used by the game; this is an atlas
   // symbol rather than a miniature rendering of the canopy sprite.
   const w=b.width*.65,h=Math.max(w*1.2,b.height*.56),x=p.x,y=p.y;
   const conifer=/pine|fir|spruce|cedar/i.test(a.id+' '+a.name);
   batches.woodland.push(ellipse(p,x,y-h*.32,w*1.45,h*.88));
   batches.treeShadows.push(ellipse(p,x+w*.1,y-h*.08,w*.52,h*.11));
   const points=conifer?[{x,y:y-h},{x:x+w*.27,y:y-h*.62},{x:x+w*.12,y:y-h*.65},{x:x+w*.42,y:y-h*.35},{x:x+w*.24,y:y-h*.38},{x:x+w*.5,y:y-h*.09},{x:x-w*.5,y:y-h*.09},{x:x-w*.24,y:y-h*.38},{x:x-w*.42,y:y-h*.35},{x:x-w*.12,y:y-h*.65},{x:x-w*.27,y:y-h*.62}]:
    Array.from({length:18},(_,i)=>{const t=i*Math.PI/9,r=i%2?.94:1.08;return{x:x+Math.cos(t)*w*.49*r,y:y-h*.58+Math.sin(t)*h*.38*r}});
   batches.trees.push(transformedPolygon(p,points));
   const line=(points:Vec[])=>{const transformed=points.map(v=>{const [x,y]=placementPoint(p,v.x,v.y);return{x,y}});return'M'+transformed.map(v=>`${n(v.x)} ${n(v.y)}`).join('L')};
   batches.treeInk.push(line([{x,y:y+h*.03},{x,y:y-h*.77}]));
   for(let i=0;i<3;i++){const level=y-h*(.3+i*.18),reach=w*(conifer?.34-i*.065:.31);batches.treeInk.push(line([{x:x-reach,y:level-h*.09},{x,y:level},{x:x+reach*.84,y:level-h*.12}]))}
   continue;
  }
  if(a.foliage){
   // Tiny tufts provide a woodland wash without thousands of coloured dots.
   const x=p.x,y=p.y,w=b.width*.18,h=b.height*.14;
   batches.foliage.push(transformedPolygon(p,[{x:x-w,y},{x:x-w*.6,y:y-h*.85},{x:x-w*.2,y:y-h*.2},{x:x+w*.08,y:y-h},{x:x+w*.3,y:y-h*.18},{x:x+w*.75,y:y-h*.7},{x:x+w,y}]));continue;
  }
  if(a.puddle){batches.puddles.push(transformedPolygon(p,a.puddle.water.map(([x,y])=>({x:b.x+x*b.width,y:b.y+y*b.height}))));continue;}
  if(a.groundDetail)continue;
  const wall=!!a.perimeter||/\bwall\b|stockade|palisade/i.test(a.name);
  const rock=/^art_rock_|boulder|\brock\b/i.test(a.id+' '+a.name);
  if(rock){const x=b.x+b.width*.5,y=b.y+b.height*.72,w=b.width*.36,h=b.height*.28;
   batches.rocks.push(transformedPolygon(p,[{x:x-w,y},{x:x-w*.7,y:y-h*.7},{x:x-w*.14,y:y-h},{x:x+w*.55,y:y-h*.77},{x:x+w,y:y-h*.1},{x:x+w*.45,y:y+h*.2},{x:x-w*.5,y:y+h*.15}]));
   batches.rockInk.push(transformedPolygon(p,[{x:x-w*.14,y:y-h},{x:x+w*.13,y:y-h*.33},{x:x+w*.45,y:y+h*.2},{x:x+w,y:y-h*.1},{x:x+w*.55,y:y-h*.77}]));continue;}
  if(wall){walls.push({p,a});continue;}
  if(!pin)continue;
  const kind:MapArtKind=pin.kind==='building'?(/workshop/i.test(a.name)?'workshop':/treatment/i.test(a.name)?'medical-tent':'warehouse'):pin.kind;
  const art=mapBuildingArt(p,kind);
  buildings.push(art);
  // Captions sit at the foot of the illustration. The actual landmark stays
  // at its gameplay position, and shares the same camera as every sprite.
  pin.caption={x:art.x,y:art.y+(Math.abs(Math.sin(art.rotation))*art.width+Math.abs(Math.cos(art.rotation))*art.height)*.45};

 }
 const styles:Record<keyof typeof batches,Omit<PlayerMapPath,'id'|'path'>>={
  woodland:{fill:'#536b2c2b'},foliage:{fill:'#59752f50'},treeShadows:{fill:'#3741273b'},trees:{fill:'#7e8b4d',stroke:'#3c4e2d',strokeWidth:4.8},treeInk:{fill:'transparent',stroke:'#3d512e',strokeWidth:3.2},
  rocks:{fill:'#c4b08b',stroke:'#6e6343',strokeWidth:4},rockInk:{fill:'#887c4f60',stroke:'#716343',strokeWidth:2},
  puddles:{fill:'#5a9390',stroke:'#315e64',strokeWidth:3},
 };
 const paths:PlayerMapPath[]=(Object.keys(batches) as (keyof typeof batches)[]).filter(id=>batches[id].length).map(id=>({id,path:batches[id].join(''),...styles[id]}));
 const campWall=(!layout.terrainImage||usesPaintedHomeTerrain(layout.terrainImage))&&walls.filter(w=>isCampMapWall(w.a.name)).length>=6;
 if(campWall)paths.push(...CAMP_MAP_WALL_PATHS);
 const result={paths,landmarks,illustrations:[...mapWallsArt(campWall?walls.filter(w=>!isCampMapWall(w.a.name)):walls),...buildings.sort((a,b)=>a.y-b.y)]};cache.set(layout,result);return result;
}

/** Retained for geographic checks and callers that need the exact outdoor
 * image registration without constructing a run. */
export const playerMapOutdoorBounds=()=>{const b=OUTDOOR_FOOTPRINT.bounds;return rectBounds(b.x,b.y,b.width,b.height)};
