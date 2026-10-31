import {buildingRestored} from './camp-restoration';
import {worldBounds} from './world-bounds';
import type {CollisionPoint} from './asset-collision';
import type {SceneDefinition,ScenePortal,SceneSpawn} from './scene-model';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {facing,type World} from './survival-engine';

export const CAMP_SCENE_ID='camp';
export const BUNKER_SCENE:SceneDefinition={
 id:'bunker',lighting:'baked',weather:'sheltered',name:'Emergency bunker',width:1254,height:1254,background:'#100e0c',
 terrain:{key:'scene:bunker:terrain:v1',url:'/survival/maps/bunker/interior-v1.jpg'},
 // The raised stair landing joins the main floor. Everything beyond this outline is solid.
 walkable:[[503,361],[888,511],[935,446],[954,440],[1026,477],[1005,555],[1067,579],[764,989],[190,646]],
 blockers:[
  [[258,560],[357,499],[389,532],[295,612]],
  [[385,455],[475,400],[503,425],[499,463],[411,523],[386,501]],
  [[543,398],[604,369],[681,402],[680,447],[616,458],[550,429]],
  [[735,472],[782,456],[873,492],[882,528],[854,548],[743,507]],
 ],
 // Repaint the near walls over feet; the supplied artwork stays unaltered.
 foreground:[[[154,613],[187,613],[792,978],[784,1088],[151,722]],[[775,981],[1089,534],[1120,553],[1113,664],[788,1087]]],
 spawns:{stairs:{x:936,y:649,direction:'down-left'}},
 portals:[{id:'stairs-out',area:[[950,469],[997,486],[981,524],[930,504]],destination:{return:true},returnSpawn:{x:936,y:649,direction:'down-left'}}],
};
export const SCENES:ReadonlyMap<string,SceneDefinition>=new Map([[BUNKER_SCENE.id,BUNKER_SCENE]]);

/** Asset connections follow the exact same transforms as their visible artwork. */
type AssetConnection={destination:{sceneId:string;spawnId:string};area:CollisionPoint[];returnPoint:CollisionPoint;exitVector:CollisionPoint;waitForAnimation:boolean};
export const ASSET_CONNECTIONS:Readonly<Record<string,AssetConnection>>={
 'misc_2dd09bb8-883b-42e3-b765-c2a1c735b016':{
  destination:{sceneId:'bunker',spawnId:'stairs'},
  area:[[.53,.555],[.67,.605],[.64,.66],[.50,.615]],
  returnPoint:[.42,.75],exitVector:[-.1,.1],waitForAnimation:true,
 },
};
function imagePoint(p:Placement,[u,v]:CollisionPoint):CollisionPoint{const b=placementBounds(p);return placementPoint(p,b.x+u*b.width,b.y+v*b.height)}
const portalCache=new WeakMap<object,ScenePortal[]>();
export function scenePortals(world:World):ScenePortal[]{
 if(world.scene)return world.scene.portals;
 if(!world.layout||!buildingRestored(world,'bunker'))return[];
 // Cache only placement geometry, not animation or occupancy. Draft edits replace the layout.
 const cached=portalCache.get(world.layout);if(cached)return cached;
 const portals:ScenePortal[]=[];
 for(const p of world.layout.items){
  const connection=ASSET_CONNECTIONS[p.assetId];if(!connection)continue;
  const [x,y]=imagePoint(p,connection.returnPoint),[ex,ey]=imagePoint(p,[connection.returnPoint[0]+connection.exitVector[0],connection.returnPoint[1]+connection.exitVector[1]]);
  const returnSpawn:SceneSpawn={x,y,direction:facing(ex-x,ey-y)};
  portals.push({id:'asset:'+p.id,area:connection.area.map(v=>imagePoint(p,v)),destination:connection.destination,returnSpawn,...(connection.waitForAnimation?{animationPlacementId:p.id}:{})});
 }
 portalCache.set(world.layout,portals);return portals;
}
export function invalidateScenePortals(world:World){if(world.layout)portalCache.delete(world.layout)}
export const sceneId=(world:World)=>world.scene?.id||CAMP_SCENE_ID;
export const sceneName=(world:World)=>world.scene?.name||'Camp';
export const sceneSize=worldBounds;
export const sceneImages=(scene:SceneDefinition):Record<string,string>=>Object.fromEntries((scene.terrain.tiles?.length?scene.terrain.tiles:[scene.terrain]).map(t=>[t.key,t.url]));
