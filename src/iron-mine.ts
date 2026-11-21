import type {CollisionPoint} from './asset-collision';
import {IRON_MINE_DOOR_ID} from './iron-mine-door';
import floor from './iron-mine-floor.json';
import {IRON_BOULDER_ID} from './ironworks-data';
import type {SceneDefinition, SceneSpawn} from './scene-model';
import {WOODEN_LOOT_ID} from './wooden-loot-art';
import type {Placement} from './world-layout';

// The survey floor and the baked terrain share world coordinates. Keep the
// door leaves, deposits and cache independent so each run can change them.
const veins: [number, number, number][] = [
  [470, 770, .76], [813, 650, .95], [1370, 500, .80], [2250, 820, .88],
  [2940, 970, 1.05], [405, 1640, .98], [840, 1580, .83], [594, 1940, 1.12],
  [1350, 1770, .90], [1840, 2220, 1.05], [1490, 2340, .82],
  [2460, 1930, .91], [2800, 2115, 1.12],
];
function prop(id:string, assetId:string, x:number, y:number, scale=1):Placement {
  return {id, assetId, x, y, scale, solid:true, role:'prop', roof:'auto'};
}

const entrance:SceneSpawn = {...floor.entrance, direction:'down'};
const items:Placement[] = [
  ...floor.doors.map(({id,x,y})=>prop('mine-door-'+id, IRON_MINE_DOOR_ID, x, y)),
  ...veins.map(([x,y,scale], i)=>prop('mine-iron-'+String(i+1).padStart(2,'0'), IRON_BOULDER_ID, x, y, scale)),
  // The old survey stores are around a blind dogleg in the eastern drift.
  prop(floor.cacheId, WOODEN_LOOT_ID, 3360, 1490, .93),
];

export const IRON_MINE_SCENE:SceneDefinition = {
  id:'iron-mine', name:'Northwest Iron Mine', width:floor.width, height:floor.height,
  lighting:'baked', weather:'sheltered', background:'#17130f',
  terrain:{key:'scene:iron-mine:workings:v2',url:'/survival/iron-mine-v1/workings-v2.webp'},
  walkable:floor.walkable as CollisionPoint[], blockers:[...floor.blockers, ...floor.fixtures] as CollisionPoint[][],
  foreground:[], spawns:{entrance},
  portals:[{id:'mine-adit-out',area:floor.exitArea as CollisionPoint[],destination:{return:true},returnSpawn:entrance}],
  layout:{
    version:1, name:'Northwest Iron Mine', terrain:'home', spawn:floor.entrance,
    items, updatedAt:'2026-11-21T00:00:00.000Z',
  },
};
