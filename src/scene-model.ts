import type {CollisionPoint} from './asset-collision';
import type {Direction} from './survival-engine';
import type {WorldLayout} from './world-layout';

export type SceneSpawn={x:number;y:number;direction:Direction};
export type SceneDestination={sceneId:string;spawnId:string}|{return:true};
export type ScenePortal={id:string;area:CollisionPoint[];destination:SceneDestination;returnSpawn:SceneSpawn;animationPlacementId?:string};
/** Registered pieces share one world scale, with a small source-pixel overlap. */
export type SceneTerrainTile={key:string;url:string;x:number;y:number;width:number;height:number};
/** Geometry is in world units. Images and collision never define each other's size.
 * Registry data can later come from saved maps without changing travel or rendering. */
export type SceneDefinition={
 id:string;name:string;width:number;height:number;background:string;
 /** Baked indoor illumination is independent of the outdoor day/night preview. */
 lighting?:'outdoor'|'baked';
 weather?:'outdoor'|'sheltered';
 terrain:{key:string;url:string;tiles?:SceneTerrainTile[]};
 walkable:CollisionPoint[];blockers:CollisionPoint[][];
 foreground:CollisionPoint[][];
 spawns:Record<string,SceneSpawn>;portals:ScenePortal[];
 layout?:WorldLayout;
};
